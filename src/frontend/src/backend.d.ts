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
    isActive: boolean;
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
    conversationId: string;
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
export enum FriendshipStatus {
    blocked = "blocked",
    pendingOutgoing = "pendingOutgoing",
    notFriends = "notFriends",
    friends = "friends",
    pendingIncoming = "pendingIncoming"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    acceptFriendRequest(other: Principal): Promise<void>;
    answerCall(callId: CallId, answer: string): Promise<CallSession>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    blockUser(other: Principal): Promise<void>;
    checkHealth(): Promise<{
        status: string;
    }>;
    declineFriendRequest(other: Principal): Promise<void>;
    deleteConversation(conversationId: ConversationId): Promise<void>;
    getCallSession(callId: CallId): Promise<CallSession | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getConversations(): Promise<Array<ConversationMetadata>>;
    getCurrentUser(): Promise<InternalUserProfile | null>;
    getFriendCommand(target: Principal): Promise<string>;
    getFriends(): Promise<Array<Principal>>;
    getMessages(conversationId: ConversationId): Promise<Array<Message>>;
    getPendingFriendRequests(): Promise<Array<Principal>>;
    getPendingIncomingCalls(): Promise<Array<CallSession>>;
    getRelationshipStatus(other: Principal): Promise<FriendshipStatus>;
    getUnreadConversations(): Promise<Array<ConversationId>>;
    getUser(principal: Principal): Promise<InternalUserProfile | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    markAsRead(conversationId: ConversationId): Promise<void>;
    register(displayName: string): Promise<InternalUserProfile>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    searchUsers(searchTerm: string): Promise<Array<InternalUserProfile>>;
    sendFriendRequest(other: Principal): Promise<void>;
    sendMessage(conversationId: ConversationId, text: string, image: ExternalBlob | null): Promise<Message>;
    startCall(callee: UserId, kind: CallKind, offer: string): Promise<CallSession>;
    startConversation(other: UserId): Promise<ConversationId>;
    updateCallStatus(callId: CallId, newStatus: CallStatus): Promise<CallSession>;
    updateDisplayName(newDisplayName: string): Promise<InternalUserProfile>;
}
