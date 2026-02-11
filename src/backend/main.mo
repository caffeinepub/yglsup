import Time "mo:core/Time";
import Map "mo:core/Map";
import Text "mo:core/Text";
import Principal "mo:core/Principal";
import List "mo:core/List";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Set "mo:core/Set";
import Runtime "mo:core/Runtime";
import Array "mo:core/Array";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";
import Migration "migration";

// Apply migration as specified in documentation
(with migration = Migration.run)
actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  include MixinStorage();

  var messageCounter = 0;

  type UserId = Principal;
  type Timestamp = Time.Time;
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

  type CallStatus = {
    #initiated;
    #ringing;
    #inProgress;
    #ended;
    #missed;
  };

  type CallSession = {
    id : CallId;
    caller : UserId;
    callee : UserId;
    status : CallStatus;
    startTime : Timestamp;
    endTime : ?Timestamp;
    kind : CallKind;
    offer : ?Text; // SDP offer/answer (as plain text)
    answer : ?Text;
  };

  type CallKind = {
    #voice;
    #video;
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

  // New FriendshipKey for persistent state
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

  // Helper to check if users are friends
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

  // Required user profile functions
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

  // User management (legacy compatibility)
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
      Runtime.trap("Unauthorized: Only users can search for other users");
    };
    let results = users.values().toList<InternalUserProfile>().filter(
      func(profile) {
        profile.displayName.contains(#text searchTerm);
      }
    ).toArray();
    results.sort();
  };

  // New friend request system
  public shared ({ caller }) func sendFriendRequest(target : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can send friend requests");
    };

    if (caller == target) {
      Runtime.trap("Cannot send a friend request to yourself");
    };

    if (areFriends(caller, target)) {
      Runtime.trap("You are already friends with this user");
    };

    let key = { user1 = caller; user2 = target };
    let reverseKey = { user1 = target; user2 = caller };

    switch (friendships.get(key)) {
      case (?existing) {
        switch (existing.status) {
          case (#pending) {
            Runtime.trap("Friend request is already pending");
          };
          case (#accepted) {
            Runtime.trap("You are already friends with this user");
          };
          case (#declined) {
            let updated = { existing with status = #pending };
            friendships.add(key, updated);
            return;
          };
          case (#blocked) {
            Runtime.trap("You have blocked this user");
          };
        };
      };
      case (null) {
        // Check for reverse request
        switch (friendships.get(reverseKey)) {
          case (?reverse) {
            if (reverse.status == #pending) {
              let updated = { reverse with status = #accepted };
              friendships.add(reverseKey, updated);
              return;
            };
          };
          case (null) {};
        };

        let newRequest : Friendship = {
          status = #pending;
          initiatedBy = caller;
          lastModified = Time.now();
        };
        friendships.add(key, newRequest);
      };
    };
  };

  public shared ({ caller }) func acceptFriendRequest(requestor : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can accept friend requests");
    };

    let key = { user1 = requestor; user2 = caller };
    switch (friendships.get(key)) {
      case (?request) {
        if (request.status != #pending) {
          Runtime.trap("No pending friend request found");
        };

        let updated = { request with status = #accepted };
        friendships.add(key, updated);

        let reciprocal : Friendship = {
          status = #accepted;
          initiatedBy = caller;
          lastModified = Time.now();
        };
        let reciprocalKey = { user1 = caller; user2 = requestor };
        friendships.add(reciprocalKey, reciprocal);
      };
      case (null) {
        Runtime.trap("No friend request to accept");
      };
    };
  };

  public shared ({ caller }) func declineFriendRequest(requestor : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can decline friend requests");
    };

    let key = { user1 = requestor; user2 = caller };
    switch (friendships.get(key)) {
      case (?request) {
        if (request.status != #pending) {
          Runtime.trap("No pending friend request found");
        };

        let updated = { request with status = #declined };
        friendships.add(key, updated);
      };
      case (null) {
        Runtime.trap("No friend request to decline");
      };
    };
  };

  public shared ({ caller }) func removeFriend(friend : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can remove friends");
    };

    let key = { user1 = caller; user2 = friend };
    let reverseKey = { user1 = friend; user2 = caller };

    if (not areFriends(caller, friend)) {
      Runtime.trap("You are not friends with this user");
    };

    friendships.remove(key);
    friendships.remove(reverseKey);
  };

  public shared ({ caller }) func blockUser(target : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can block others");
    };

    let key = { user1 = caller; user2 = target };
    let block : Friendship = {
      status = #blocked;
      initiatedBy = caller;
      lastModified = Time.now();
    };
    friendships.add(key, block);
  };

  public query ({ caller }) func getFriends() : async [Principal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can retrieve friends");
    };

    let friends = List.empty<Principal>();
    friendships.keys().forEach(
      func(key) {
        switch (friendships.get(key)) {
          case (?record) {
            if (record.status == #accepted and key.user1 == caller) {
              friends.add(key.user2);
            };
          };
          case (null) {};
        };
      }
    );
    friends.toArray();
  };

  public query ({ caller }) func getPendingFriendRequests() : async [Principal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can retrieve friend requests");
    };

    let requests = List.empty<Principal>();
    friendships.keys().forEach(
      func(key) {
        switch (friendships.get(key)) {
          case (?record) {
            if ((record.status == #pending) and key.user2 == caller) {
              requests.add(key.user1);
            };
          };
          case (null) {};
        };
      }
    );
    requests.toArray();
  };

  // Messaging
  public shared ({ caller }) func startConversation(other : UserId) : async ConversationId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can start conversations");
    };

    if (not areFriends(caller, other)) {
      Runtime.trap("Cannot start a conversation without a friendship");
    };

    let conversationId = makeConversationId(caller, other);

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

  public shared ({ caller }) func sendMessage(conversationId : ConversationId, text : Text, image : ?Storage.ExternalBlob) : async Message {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can send messages");
    };

    switch (conversations.get(conversationId)) {
      case (?conversation) {
        // Verify caller is a participant
        if (not isParticipant(caller, conversation.participants)) {
          Runtime.trap("You are not a participant in this conversation");
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
        // Verify caller is a participant
        if (not isParticipant(caller, conversation.participants)) {
          Runtime.trap("You are not a participant in this conversation");
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
      Runtime.trap("Unauthorized: Only users can retrieve their conversations");
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
            participants = convo.participants;
            lastMessage;
            lastUpdate = convo.lastUpdate;
          };
        }
      ).toArray();
  };

  public query ({ caller }) func getMessages(conversationId : ConversationId) : async [Message] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can retrieve messages");
    };

    switch (conversations.get(conversationId)) {
      case (?conversation) {
        // Verify caller is a participant
        if (not isParticipant(caller, conversation.participants)) {
          Runtime.trap("You are not a participant in this conversation");
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

  // Call management (simplified session model)
  public shared ({ caller }) func initiateCall(callee : UserId, kind : CallKind) : async CallId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can initiate calls");
    };

    if (not areFriends(caller, callee)) {
      Runtime.trap("Cannot initiate a call without a friendship");
    };

    let callId = Time.now().toText();

    let session : CallSession = {
      id = callId;
      caller;
      callee;
      status = #initiated;
      startTime = Time.now();
      endTime = null;
      kind;
      offer = null;
      answer = null;
    };

    calls.add(callId, session);
    callId;
  };

  public shared ({ caller }) func updateCallOffer(callId : CallId, offer : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update call offers");
    };

    switch (calls.get(callId)) {
      case (?session) {
        if (caller != session.caller) {
          Runtime.trap("Only the caller can update the offer");
        };
        let updatedSession = { session with offer = ?offer };
        calls.add(callId, updatedSession);
      };
      case (null) {
        Runtime.trap("Call not found");
      };
    };
  };

  public shared ({ caller }) func answerCall(callId : CallId, answer : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can answer calls");
    };

    switch (calls.get(callId)) {
      case (?session) {
        if (caller != session.callee) {
          Runtime.trap("Only the callee can answer the call");
        };
        let updatedSession = {
          session with
          answer = ?answer;
          status = #ringing;
        };
        calls.add(callId, updatedSession);
      };
      case (null) {
        Runtime.trap("Call not found");
      };
    };
  };

  public query ({ caller }) func fetchCallOffer(callId : CallId) : async ?Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can fetch call offers");
    };

    switch (calls.get(callId)) {
      case (?session) {
        // Only participants can fetch the offer
        if (not isCallParticipant(caller, session)) {
          Runtime.trap("You are not a participant in this call");
        };
        session.offer;
      };
      case (null) { null };
    };
  };

  public query ({ caller }) func fetchCallAnswer(callId : CallId) : async ?Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can fetch call answers");
    };

    switch (calls.get(callId)) {
      case (?session) {
        // Only participants can fetch the answer
        if (not isCallParticipant(caller, session)) {
          Runtime.trap("You are not a participant in this call");
        };
        session.answer;
      };
      case (null) { null };
    };
  };

  public shared ({ caller }) func updateCallStatus(callId : CallId, newStatus : CallStatus) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update call status");
    };

    switch (calls.get(callId)) {
      case (?session) {
        // Only participants can update the call status
        if (not isCallParticipant(caller, session)) {
          Runtime.trap("You are not a participant in this call");
        };

        let updatedSession = {
          session with
          status = newStatus;
          endTime = if (newStatus == #ended or newStatus == #missed) { ?Time.now() } else { session.endTime };
        };
        calls.add(callId, updatedSession);
      };
      case (null) {
        Runtime.trap("Call not found");
      };
    };
  };

  public query ({ caller }) func getActiveCalls() : async [CallSession] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view active calls");
    };

    // Only return calls where the caller is a participant
    calls.values().toList<CallSession>().filter(
      func(session) {
        isCallParticipant(caller, session);
      }
    ).toArray();
  };

  public query ({ caller }) func getCallDetails(callId : CallId) : async ?CallSession {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view call details");
    };

    switch (calls.get(callId)) {
      case (?session) {
        // Only participants can view call details
        if (not isCallParticipant(caller, session)) {
          Runtime.trap("You are not a participant in this call");
        };
        ?session;
      };
      case (null) { null };
    };
  };
};
