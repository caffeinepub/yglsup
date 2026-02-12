import Time "mo:core/Time";
import Text "mo:core/Text";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Array "mo:core/Array";
import Map "mo:core/Map";
import List "mo:core/List";
import Iter "mo:core/Iter";
import Set "mo:core/Set";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  include MixinStorage();

  var messageCounter = 0;

  type UserId = Principal;
  type Timestamp = Int;
  type ConversationId = Text;
  type CallId = Text;

  public type UserProfile = {
    name : Text;
  };

  type InternalUserProfile = {
    principal : Principal;
    displayName : Text;
  };

  module InternalUserProfile {
    public func compare(profile1 : InternalUserProfile, profile2 : InternalUserProfile) : Order.Order {
      Text.compare(profile1.displayName, profile2.displayName);
    };
  };

  type Message = {
    id : Nat;
    sender : UserId;
    text : Text;
    timestamp : Timestamp;
    image : ?Storage.ExternalBlob;
  };

  type ConversationMetadata = {
    conversationId : Text;
    participants : (UserId, UserId);
    lastMessage : ?Message;
    lastUpdate : Timestamp;
  };

  type Conversation = {
    id : ConversationId;
    participants : (UserId, UserId);
    messages : [Message];
    lastSeen : Map.Map<UserId, Timestamp>;
    lastUpdate : Timestamp;
  };

  type CallKind = {
    #voice;
    #video;
  };

  public type CallStatus = {
    #initiated;
    #ringing;
    #inProgress;
    #ended;
    #missed;
  };

  public type CallSession = {
    id : CallId;
    caller : UserId;
    callee : UserId;
    status : CallStatus;
    startTime : Timestamp;
    endTime : ?Timestamp;
    kind : CallKind;
    offer : ?Text;
    answer : ?Text;
    isActive : Bool;
  };

  public type FriendStatus = {
    #pending;
    #accepted;
    #declined;
    #blocked;
  };

  type Friendship = {
    status : FriendStatus;
    initiatedBy : Principal;
    lastModified : Timestamp;
  };

  type FriendshipKey = {
    user1 : Principal;
    user2 : Principal;
  };

  module FriendshipKey {
    public func compare(a : FriendshipKey, b : FriendshipKey) : Order.Order {
      func comparePrincipal(p1 : Principal, p2 : Principal) : Order.Order {
        if (p1 < p2) { #less } else if (p1 == p2) { #equal } else { #greater };
      };
      switch (comparePrincipal(a.user1, b.user1)) {
        case (#equal) { comparePrincipal(a.user2, b.user2) };
        case (order) { order };
      };
    };
  };

  public type FriendshipStatus = {
    #notFriends;
    #pendingOutgoing;
    #pendingIncoming;
    #friends;
    #blocked;
  };

  let users = Map.empty<UserId, InternalUserProfile>();
  let conversations = Map.empty<ConversationId, Conversation>();
  let calls = Map.empty<CallId, CallSession>();
  let friendships = Map.empty<FriendshipKey, Friendship>();

  func makeConversationId(user1 : UserId, user2 : UserId) : ConversationId {
    let p1 = user1.toText();
    let p2 = user2.toText();
    if (p1 < p2) { p1 # "-" # p2 } else { p2 # "-" # p1 };
  };

  func isParticipant(caller : UserId, participants : (UserId, UserId)) : Bool {
    let (user1, user2) = participants;
    caller == user1 or caller == user2;
  };

  func isCallParticipant(caller : UserId, session : CallSession) : Bool {
    caller == session.caller or caller == session.callee;
  };

  func areFriends(user1 : Principal, user2 : Principal) : Bool {
    let key1 = { user1; user2 };
    let key2 = { user1 = user2; user2 = user1 };
    switch (friendships.get(key1)) {
      case (?record) {
        record.status == #accepted;
      };
      case (null) {
        switch (friendships.get(key2)) {
          case (?record) { return record.status == #accepted };
          case (null) { return false };
        };
      };
    };
  };

  func getFriendshipKey(user1 : Principal, user2 : Principal) : FriendshipKey {
    if (user1 < user2) {
      { user1; user2 };
    } else {
      { user1 = user2; user2 = user1 };
    };
  };

  func getFriendship(user1 : Principal, user2 : Principal) : ?Friendship {
    let key = getFriendshipKey(user1, user2);
    friendships.get(key);
  };

  // New lightweight canister health check method
  public query ({ caller }) func checkHealth() : async { status : Text } {
    { status = "Ok" };
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    switch (users.get(caller)) {
      case (?profile) { ?{ name = profile.displayName } };
      case (null) { null };
    };
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    let internalProfile = {
      principal = caller;
      displayName = profile.name;
    };
    users.add(caller, internalProfile);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    switch (users.get(user)) {
      case (?profile) { ?{ name = profile.displayName } };
      case (null) { null };
    };
  };

  public shared ({ caller }) func register(displayName : Text) : async InternalUserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can register profiles");
    };
    let profile = { principal = caller; displayName };
    users.add(caller, profile);
    profile;
  };

  public shared ({ caller }) func updateDisplayName(newDisplayName : Text) : async InternalUserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update display name");
    };
    switch (users.get(caller)) {
      case (?profile) {
        let updatedProfile = { profile with displayName = newDisplayName };
        users.add(caller, updatedProfile);
        updatedProfile;
      };
      case (null) {
        let newProfile = {
          principal = caller;
          displayName = newDisplayName;
        };
        users.add(caller, newProfile);
        newProfile;
      };
    };
  };

  public query ({ caller }) func getCurrentUser() : async ?InternalUserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access their profile");
    };
    users.get(caller);
  };

  public query ({ caller }) func getUser(principal : Principal) : async ?InternalUserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    users.get(principal);
  };

  public query ({ caller }) func searchUsers(searchTerm : Text) : async [InternalUserProfile] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return [];
    };
    let results = users.values().toList<InternalUserProfile>().filter(
      func(profile) {
        profile.displayName.contains(#text searchTerm);
      }
    ).toArray();
    results.sort();
  };

  public shared ({ caller }) func sendFriendRequest(other : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can send friend requests");
    };
    if (caller == other) {
      Runtime.trap("Cannot send friend request to yourself");
    };
    let key = getFriendshipKey(caller, other);
    switch (friendships.get(key)) {
      case (?existing) {
        if (existing.status == #blocked) {
          Runtime.trap("Cannot send friend request: blocked");
        };
        Runtime.trap("Friend request already exists");
      };
      case (null) {
        let friendship : Friendship = {
          status = #pending;
          initiatedBy = caller;
          lastModified = Time.now();
        };
        friendships.add(key, friendship);
      };
    };
  };

  public shared ({ caller }) func acceptFriendRequest(other : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can accept friend requests");
    };
    let key = getFriendshipKey(caller, other);
    switch (friendships.get(key)) {
      case (?friendship) {
        if (friendship.initiatedBy == caller) {
          Runtime.trap("Cannot accept your own friend request");
        };
        if (friendship.status != #pending) {
          Runtime.trap("Friend request is not pending");
        };
        let updated = {
          friendship with
          status = #accepted;
          lastModified = Time.now();
        };
        friendships.add(key, updated);
      };
      case (null) {
        Runtime.trap("Friend request not found");
      };
    };
  };

  public shared ({ caller }) func declineFriendRequest(other : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can decline friend requests");
    };
    let key = getFriendshipKey(caller, other);
    switch (friendships.get(key)) {
      case (?friendship) {
        if (friendship.initiatedBy == caller) {
          Runtime.trap("Cannot decline your own friend request");
        };
        if (friendship.status != #pending) {
          Runtime.trap("Friend request is not pending");
        };
        let updated = {
          friendship with
          status = #declined;
          lastModified = Time.now();
        };
        friendships.add(key, updated);
      };
      case (null) {
        Runtime.trap("Friend request not found");
      };
    };
  };

  public shared ({ caller }) func blockUser(other : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can block users");
    };
    if (caller == other) {
      Runtime.trap("Cannot block yourself");
    };
    let key = getFriendshipKey(caller, other);
    let friendship : Friendship = {
      status = #blocked;
      initiatedBy = caller;
      lastModified = Time.now();
    };
    friendships.add(key, friendship);
  };

  public query ({ caller }) func getFriends() : async [Principal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return [];
    };
    friendships.entries().toList<(FriendshipKey, Friendship)>().filter(
      func((key, friendship) : (FriendshipKey, Friendship)) : Bool {
        friendship.status == #accepted and (key.user1 == caller or key.user2 == caller);
      }
    ).map<(FriendshipKey, Friendship), Principal>(
        func((key, _)) { if (key.user1 == caller) { key.user2 } else { key.user1 } }
      ).toArray();
  };

  public query ({ caller }) func getPendingFriendRequests() : async [Principal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return [];
    };
    friendships.entries().toList<(FriendshipKey, Friendship)>().filter(
      func((key, friendship) : (FriendshipKey, Friendship)) : Bool {
        friendship.status == #pending and friendship.initiatedBy != caller and (key.user1 == caller or key.user2 == caller);
      }
    ).map<(FriendshipKey, Friendship), Principal>(
        func((key, _ : Friendship)) : Principal {
          if (key.user1 == caller) { key.user2 } else { key.user1 };
        }
      ).toArray();
  };

  public query ({ caller }) func getRelationshipStatus(other : Principal) : async FriendshipStatus {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can check relationship status");
    };
    if (caller == other) {
      Runtime.trap("Cannot check relationship status with yourself");
    };
    switch (friendships.get(getFriendshipKey(caller, other))) {
      case (?friendship) {
        switch (friendship.status) {
          case (#accepted) { #friends };
          case (#pending) {
            if (friendship.initiatedBy == caller) {
              #pendingOutgoing;
            } else {
              #pendingIncoming;
            };
          };
          case (#blocked) { #blocked };
          case (#declined) { #notFriends };
        };
      };
      case (null) { #notFriends };
    };
  };

  public shared ({ caller }) func startConversation(other : UserId) : async ConversationId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can start conversations");
    };
    if (caller == other) {
      Runtime.trap("Cannot start a conversation with yourself");
    };
    if (not areFriends(caller, other)) {
      Runtime.trap("Can only start conversations with friends");
    };
    let conversationId = makeConversationId(caller, other);

    switch (conversations.get(conversationId)) {
      case (?existingConversation) {
        conversationId;
      };
      case (null) {
        let participants = (caller, other);
        let emptyLastSeen = Map.empty<UserId, Timestamp>();
        let conversation : Conversation = {
          id = conversationId;
          participants;
          messages = [];
          lastSeen = emptyLastSeen;
          lastUpdate = Time.now();
        };
        conversations.add(conversationId, conversation);
        conversationId;
      };
    };
  };

  public shared ({ caller }) func sendMessage(conversationId : ConversationId, text : Text, image : ?Storage.ExternalBlob) : async Message {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can send messages");
    };
    switch (conversations.get(conversationId)) {
      case (?conversation) {
        if (not isParticipant(caller, conversation.participants)) {
          Runtime.trap("Unauthorized: You are not a participant in this conversation");
        };
        let message : Message = {
          id = messageCounter;
          sender = caller;
          text;
          timestamp = Time.now();
          image;
        };
        messageCounter += 1;
        let updatedMessages = conversation.messages.concat([message]);
        let updatedConversation = {
          conversation with
          messages = updatedMessages;
          lastUpdate = Time.now();
        };
        conversations.add(conversationId, updatedConversation);
        message;
      };
      case (null) {
        Runtime.trap("Conversation not found");
      };
    };
  };

  public shared ({ caller }) func markAsRead(conversationId : ConversationId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can mark messages as read");
    };
    switch (conversations.get(conversationId)) {
      case (?conversation) {
        if (not isParticipant(caller, conversation.participants)) {
          Runtime.trap("Unauthorized: You are not a participant in this conversation");
        };
        let updatedLastSeen = conversation.lastSeen.clone();
        updatedLastSeen.add(caller, Time.now());
        let updatedConversation = { conversation with lastSeen = updatedLastSeen };
        conversations.add(conversationId, updatedConversation);
      };
      case (null) {
        Runtime.trap("Conversation not found");
      };
    };
  };

  public query ({ caller }) func getConversations() : async [ConversationMetadata] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return [];
    };
    conversations.values().toList<Conversation>().filter(
      func(convo) {
        isParticipant(caller, convo.participants);
      }
    ).map<Conversation, ConversationMetadata>(
        func(convo) {
          let lastMessage = if (convo.messages.size() > 0) {
            ?convo.messages[convo.messages.size() - 1];
          } else {
            null;
          };
          {
            conversationId = convo.id;
            participants = convo.participants;
            lastMessage;
            lastUpdate = convo.lastUpdate;
          };
        }
      ).toArray();
  };

  public query ({ caller }) func getMessages(conversationId : ConversationId) : async [Message] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view messages");
    };
    switch (conversations.get(conversationId)) {
      case (?conversation) {
        if (not isParticipant(caller, conversation.participants)) {
          Runtime.trap("Unauthorized: You are not a participant in this conversation");
        };
        conversation.messages;
      };
      case (null) {
        Runtime.trap("Conversation not found");
      };
    };
  };

  public query ({ caller }) func getUnreadConversations() : async [ConversationId] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return [];
    };
    let unread = Set.empty<ConversationId>();
    conversations.values().toList<Conversation>().forEach(
      func(convo) {
        if (isParticipant(caller, convo.participants)) {
          let lastMessage = if (convo.messages.size() > 0) {
            ?convo.messages[convo.messages.size() - 1];
          } else {
            null;
          };
          switch (lastMessage) {
            case (?msg) {
              switch (convo.lastSeen.get(caller)) {
                case (?lastSeen) {
                  if (lastSeen < msg.timestamp) {
                    unread.add(convo.id);
                  };
                };
                case (null) {
                  unread.add(convo.id);
                };
              };
            };
            case (null) {};
          };
        };
      }
    );
    unread.toArray();
  };

  public shared ({ caller }) func deleteConversation(conversationId : ConversationId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete conversations");
    };
    switch (conversations.get(conversationId)) {
      case (?conversation) {
        if (not isParticipant(caller, conversation.participants)) {
          Runtime.trap("Unauthorized: You are not a participant in this conversation");
        };
        conversations.remove(conversationId);
      };
      case (null) {
        Runtime.trap("Conversation not found or already deleted");
      };
    };
  };

  public shared ({ caller }) func startCall(callee : UserId, kind : CallKind, offer : Text) : async CallSession {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can start calls");
    };
    if (caller == callee) {
      Runtime.trap("Cannot call yourself");
    };
    if (not areFriends(caller, callee)) {
      Runtime.trap("Can only call friends");
    };
    let callId = caller.toText() # callee.toText() # Time.now().toText();
    let session : CallSession = {
      id = callId;
      caller = caller;
      callee = callee;
      status = #initiated;
      startTime = Time.now();
      endTime = null;
      kind;
      offer = ?offer;
      answer = null;
      isActive = true;
    };
    calls.add(callId, session);
    session;
  };

  public query ({ caller }) func getCallSession(callId : CallId) : async ?CallSession {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view call sessions");
    };
    switch (calls.get(callId)) {
      case (?session) {
        if (not isCallParticipant(caller, session)) {
          Runtime.trap("Unauthorized: You are not a participant in this call");
        };
        ?session;
      };
      case (null) {
        null;
      };
    };
  };

  public query ({ caller }) func getPendingIncomingCalls() : async [CallSession] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return [];
    };
    calls.values().toList<CallSession>().filter(
      func(session) {
        session.callee == caller and session.caller != caller and session.isActive and (session.status == #initiated or session.status == #ringing);
      }
    ).toArray();
  };

  public shared ({ caller }) func answerCall(callId : CallId, answer : Text) : async CallSession {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can answer calls");
    };
    switch (calls.get(callId)) {
      case (?session) {
        if (caller != session.callee) {
          Runtime.trap("Unauthorized: Only the callee can answer this call");
        };
        if (session.status != #initiated and session.status != #ringing) {
          Runtime.trap("Call cannot be answered in current status");
        };
        let updatedSession = {
          session with answer = ?answer;
          status = #inProgress;
        };
        calls.add(callId, updatedSession);
        updatedSession;
      };
      case (null) {
        Runtime.trap("Call session not found");
      };
    };
  };

  public shared ({ caller }) func updateCallStatus(callId : CallId, newStatus : CallStatus) : async CallSession {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update call status");
    };
    switch (calls.get(callId)) {
      case (?session) {
        if (not isCallParticipant(caller, session)) {
          Runtime.trap("Unauthorized: You are not a participant in this call");
        };

        switch (newStatus) {
          case (#ended) {
            if (session.status != #inProgress and session.status != #ringing and session.status != #initiated) {
              Runtime.trap("Call cannot be ended from current status");
            };
            let updatedSession = {
              session with status = #ended;
              endTime = ?Time.now();
              isActive = false;
            };
            calls.add(callId, updatedSession);
            updatedSession;
          };
          case (#missed) {
            // Only the callee can mark a call as missed
            if (caller != session.callee) {
              Runtime.trap("Unauthorized: Only the callee can mark a call as missed");
            };
            if (session.status != #initiated and session.status != #ringing) {
              Runtime.trap("Call cannot be marked as missed from current status");
            };
            let updatedSession = {
              session with status = #missed;
              endTime = ?Time.now();
              isActive = false;
            };
            calls.add(callId, updatedSession);
            updatedSession;
          };
          case (#ringing) {
            // Only the caller can update to ringing status
            if (caller != session.caller) {
              Runtime.trap("Unauthorized: Only the caller can update call to ringing");
            };
            if (session.status != #initiated) {
              Runtime.trap("Call can only be set to ringing from initiated status");
            };
            let updatedSession = { session with status = #ringing };
            calls.add(callId, updatedSession);
            updatedSession;
          };
          case (#inProgress) {
            // Only the callee can move to inProgress (via answerCall is preferred)
            if (caller != session.callee) {
              Runtime.trap("Unauthorized: Only the callee can move call to inProgress");
            };
            if (session.status != #ringing and session.status != #initiated) {
              Runtime.trap("Call cannot be moved to inProgress from current status");
            };
            let updatedSession = { session with status = #inProgress };
            calls.add(callId, updatedSession);
            updatedSession;
          };
          case (#initiated) {
            Runtime.trap("Cannot transition back to initiated status");
          };
        };
      };
      case (null) {
        Runtime.trap("Call session not found");
      };
    };
  };

  public query ({ caller }) func getFriendCommand(target : Principal) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return "not-authorized";
    };
    if (target == caller) {
      return "cannot-send-friend-request-to-yourself";
    };
    switch (friendships.get(getFriendshipKey(caller, target))) {
      case (?friendship) {
        switch (friendship.status) {
          case (#accepted) { return "already-friends" };
          case (#pending) {
            if (friendship.initiatedBy == caller) {
              return "pending";
            } else {
              return "accept-request";
            };
          };
          case (#blocked) { return "blocked" };
          case (#declined) { return "not-friends" };
        };
      };
      case (null) { return "not-friends" };
    };
  };
};
