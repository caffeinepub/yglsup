import { useState } from 'react';
import ConversationList from './ConversationList';
import MessageThread from './MessageThread';
import ProfileMenu from '../profile/ProfileMenu';
import NewChatDialog from './NewChatDialog';
import FriendRequestsDialog from './FriendRequestsDialog';
import CallScreen from '../calls/CallScreen';
import CallChip from '../calls/CallChip';
import { useCall } from '../calls/CallProvider';
import { usePendingFriendRequests } from '../../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquarePlus, Users } from 'lucide-react';
import type { InternalUserProfile, ConversationId } from '../../backend';

interface ChatShellProps {
  currentUser: InternalUserProfile;
}

export default function ChatShell({ currentUser }: ChatShellProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<ConversationId | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const { activeCall, isMinimized } = useCall();
  const { data: pendingRequests = [] } = usePendingFriendRequests();

  const handleConversationStart = (conversationId: ConversationId) => {
    setSelectedConversationId(conversationId);
    setShowNewChat(false);
  };

  const showFullCallScreen = activeCall && !isMinimized;

  return (
    <>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
        {/* Left Panel - Conversation List */}
        <div className="w-full md:w-96 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-white dark:bg-gray-900">
          {/* Header */}
          <div className="h-16 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 bg-gradient-to-r from-emerald-600 to-teal-600">
            <div className="flex items-center space-x-3">
              <img 
                src="/assets/generated/yglsup-app-icon.dim_512x512.png" 
                alt="YGLSUP"
                className="h-10 w-10 rounded-lg shadow-md"
              />
              <h1 className="text-xl font-bold text-white">YGLSUP</h1>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowFriendRequests(true)}
                  className="text-white hover:bg-white/20"
                  title="Friend requests"
                >
                  <Users className="h-5 w-5" />
                </Button>
                {pendingRequests.length > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
                    {pendingRequests.length}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNewChat(true)}
                className="text-white hover:bg-white/20"
              >
                <MessageSquarePlus className="h-5 w-5" />
              </Button>
              <ProfileMenu currentUser={currentUser} />
            </div>
          </div>

          {/* Conversation List */}
          <ConversationList
            currentUser={currentUser}
            selectedConversationId={selectedConversationId}
            onSelectConversation={setSelectedConversationId}
          />
        </div>

        {/* Right Panel - Message Thread */}
        <div className="flex-1 flex flex-col">
          {selectedConversationId ? (
            <MessageThread
              conversationId={selectedConversationId}
              currentUser={currentUser}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-emerald-50/30 dark:from-gray-900 dark:to-emerald-950/30">
              <div className="text-center space-y-4 px-4">
                <div className="flex justify-center">
                  <div className="rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 p-6 shadow-xl">
                    <MessageSquarePlus className="h-16 w-16 text-white" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Welcome to YGLSUP
                </h2>
                <p className="text-muted-foreground max-w-md">
                  Select a conversation from the list or start a new chat to begin messaging
                </p>
                <Button
                  onClick={() => setShowNewChat(true)}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                >
                  <MessageSquarePlus className="mr-2 h-4 w-4" />
                  Start New Chat
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* New Chat Dialog */}
        <NewChatDialog
          open={showNewChat}
          onOpenChange={setShowNewChat}
          onConversationStart={handleConversationStart}
          currentUser={currentUser}
        />

        {/* Friend Requests Dialog */}
        <FriendRequestsDialog
          open={showFriendRequests}
          onOpenChange={setShowFriendRequests}
        />
      </div>

      {/* Call UI */}
      {showFullCallScreen && <CallScreen />}
      <CallChip />
    </>
  );
}
