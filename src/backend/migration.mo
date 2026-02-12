import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  type CallId = Text;
  type UserId = Principal;
  type Timestamp = Int;

  type CallKind = {
    #voice;
    #video;
  };

  type CallStatus = {
    #initiated;
    #ringing;
    #inProgress;
    #ended;
    #missed;
  };

  type OldCallSession = {
    id : CallId;
    caller : UserId;
    callee : UserId;
    status : CallStatus;
    startTime : Timestamp;
    endTime : ?Timestamp;
    kind : CallKind;
    offer : ?Text;
    answer : ?Text;
  };

  type NewCallSession = {
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

  type OldActor = {
    calls : Map.Map<CallId, OldCallSession>;
  };

  type NewActor = {
    calls : Map.Map<CallId, NewCallSession>;
  };

  public func run(old : OldActor) : NewActor {
    let newCalls = old.calls.map<CallId, OldCallSession, NewCallSession>(
      func(_callId, oldSession) {
        {
          oldSession with
          isActive = oldSession.status != #ended and oldSession.status != #missed;
        };
      }
    );
    { calls = newCalls };
  };
};
