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
};
