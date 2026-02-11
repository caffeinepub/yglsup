import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSendMessage } from '../../hooks/useQueries';
import { Send, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { ExternalBlob } from '../../backend';
import type { ConversationId } from '../../backend';
import { toast } from 'sonner';

interface MessageComposerProps {
  conversationId: ConversationId;
}

export default function MessageComposer({ conversationId }: MessageComposerProps) {
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sendMessageMutation = useSendMessage();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setSelectedImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedMessage = message.trim();
    if (!trimmedMessage && !selectedImage) return;
    if (sendMessageMutation.isPending) return;

    try {
      let imageBlob: ExternalBlob | null = null;

      if (selectedImage) {
        const arrayBuffer = await selectedImage.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        imageBlob = ExternalBlob.fromBytes(uint8Array).withUploadProgress((percentage) => {
          setUploadProgress(percentage);
        });
      }

      await sendMessageMutation.mutateAsync({
        conversationId,
        text: trimmedMessage || '',
        image: imageBlob,
      });

      // Clear form
      setMessage('');
      clearImage();
    } catch (error: any) {
      console.error('Failed to send message:', error);
      if (error.message?.includes('friendship')) {
        toast.error('You must be friends to send messages');
      } else {
        toast.error('Failed to send message. Please try again.');
      }
    }
  };

  const isUploading = sendMessageMutation.isPending && uploadProgress > 0 && uploadProgress < 100;

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      {imagePreview && (
        <div className="mb-3 relative inline-block">
          <img
            src={imagePreview}
            alt="Preview"
            className="h-20 w-20 object-cover rounded-lg border-2 border-emerald-200 dark:border-emerald-800"
          />
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
            onClick={clearImage}
            disabled={sendMessageMutation.isPending}
          >
            <X className="h-3 w-3" />
          </Button>
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
              <div className="text-white text-xs font-semibold">{uploadProgress}%</div>
            </div>
          )}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          onChange={handleImageSelect}
          className="hidden"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={sendMessageMutation.isPending}
          className="shrink-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
        >
          <ImageIcon className="h-5 w-5" />
        </Button>
        <Input
          type="text"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={sendMessageMutation.isPending}
          className="flex-1 h-12 rounded-full bg-gray-100 dark:bg-gray-800 border-0 focus-visible:ring-emerald-600"
        />
        <Button
          type="submit"
          disabled={(!message.trim() && !selectedImage) || sendMessageMutation.isPending}
          size="icon"
          className="shrink-0 h-12 w-12 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md"
        >
          {sendMessageMutation.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </form>
    </div>
  );
}
