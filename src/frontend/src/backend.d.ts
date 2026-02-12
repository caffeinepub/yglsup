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
export type ConversationId = string;
export type UserId = Principal;
export type Timestamp = bigint;
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
export interface UserProfile {
    name: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteConversation(conversationId: ConversationId): Promise<void>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getConversations(): Promise<Array<ConversationMetadata>>;
    getCurrentUser(): Promise<InternalUserProfile | null>;
    getMessages(conversationId: ConversationId): Promise<Array<Message>>;
    getUnreadConversations(): Promise<Array<ConversationId>>;
    getUser(principal: Principal): Promise<InternalUserProfile | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    markAsRead(conversationId: ConversationId): Promise<void>;
    register(displayName: string): Promise<InternalUserProfile>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    searchUsers(searchTerm: string): Promise<Array<InternalUserProfile>>;
    sendMessage(conversationId: ConversationId, text: string, image: ExternalBlob | null): Promise<Message>;
    startConversation(other: UserId): Promise<ConversationId>;
    updateDisplayName(newDisplayName: string): Promise<InternalUserProfile>;
}
