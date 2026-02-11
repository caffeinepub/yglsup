import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export type Timestamp = bigint;
export interface CallSession {
    id: CallId;
    startTime: Timestamp;
    status: CallStatus;
    offer?: string;
    endTime?: Timestamp;
    kind: CallKind;
    answer?: string;
    callee: UserId;
    caller: UserId;
}
export type ConversationId = string;
export type UserId = Principal;
export interface Message {
    id: bigint;
    text: string;
    sender: UserId;
    timestamp: Timestamp;
    image?: ExternalBlob;
}
export interface InternalUserProfile {
    principal: Principal;
    displayName: string;
}
export interface ConversationMetadata {
    participants: [UserId, UserId];
    lastMessage?: Message;
    lastUpdate: Timestamp;
}
export type CallId = string;
export interface UserProfile {
    name: string;
}
export enum CallKind {
    video = "video",
    voice = "voice"
}
export enum CallStatus {
    ringing = "ringing",
    initiated = "initiated",
    missed = "missed",
    ended = "ended",
    inProgress = "inProgress"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    acceptFriendRequest(requestor: Principal): Promise<void>;
    answerCall(callId: CallId, answer: string): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    blockUser(target: Principal): Promise<void>;
    declineFriendRequest(requestor: Principal): Promise<void>;
    fetchCallAnswer(callId: CallId): Promise<string | null>;
    fetchCallOffer(callId: CallId): Promise<string | null>;
    getActiveCalls(): Promise<Array<CallSession>>;
    getCallDetails(callId: CallId): Promise<CallSession | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getConversations(): Promise<Array<ConversationMetadata>>;
    getCurrentUser(): Promise<InternalUserProfile | null>;
    getFriends(): Promise<Array<Principal>>;
    getMessages(conversationId: ConversationId): Promise<Array<Message>>;
    getPendingFriendRequests(): Promise<Array<Principal>>;
    getUnreadConversations(): Promise<Array<ConversationId>>;
    getUser(principal: Principal): Promise<InternalUserProfile | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    initiateCall(callee: UserId, kind: CallKind): Promise<CallId>;
    isCallerAdmin(): Promise<boolean>;
    markAsRead(conversationId: ConversationId): Promise<void>;
    register(displayName: string): Promise<InternalUserProfile>;
    removeFriend(friend: Principal): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    searchUsers(searchTerm: string): Promise<Array<InternalUserProfile>>;
    sendFriendRequest(target: Principal): Promise<void>;
    sendMessage(conversationId: ConversationId, text: string, image: ExternalBlob | null): Promise<Message>;
    startConversation(other: UserId): Promise<ConversationId>;
    updateCallOffer(callId: CallId, offer: string): Promise<void>;
    updateCallStatus(callId: CallId, newStatus: CallStatus): Promise<void>;
    updateDisplayName(newDisplayName: string): Promise<InternalUserProfile>;
}
