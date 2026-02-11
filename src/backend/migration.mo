import Map "mo:core/Map";
import Array "mo:core/Array";
import Principal "mo:core/Principal";
import Storage "blob-storage/Storage";

module {
  type OldMessage = {
    id : Nat;
    sender : Principal;
    text : Text;
    timestamp : Int;
  };

  type OldConversation = {
    id : Text;
    participants : (Principal, Principal);
    messages : [OldMessage];
    lastSeen : Map.Map<Principal, Int>;
    lastUpdate : Int;
  };

  type NewMessage = {
    id : Nat;
    sender : Principal;
    text : Text;
    timestamp : Int;
    image : ?Storage.ExternalBlob;
  };

  type NewConversation = {
    id : Text;
    participants : (Principal, Principal);
    messages : [NewMessage];
    lastSeen : Map.Map<Principal, Int>;
    lastUpdate : Int;
  };

  type OldActor = {
    conversations : Map.Map<Text, OldConversation>;
  };

  type NewActor = {
    conversations : Map.Map<Text, NewConversation>;
  };

  public func run(old : OldActor) : NewActor {
    let newConversations = old.conversations.map<Text, OldConversation, NewConversation>(
      func(_id, oldConversation) {
        let newMessages = oldConversation.messages.map(
          func(oldMsg) { { oldMsg with image = null } }
        );
        { oldConversation with messages = newMessages };
      }
    );
    { conversations = newConversations };
  };
};
