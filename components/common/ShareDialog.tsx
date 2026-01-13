import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Facebook, Twitter, Copy } from "lucide-react";
import { toast } from "sonner";

interface MediaItem {
  url: string;
  title: string;
}

interface ShareDialogProps {
  item: MediaItem;
  isOpen: boolean;
  onClose: () => void;
  dict?: { common?: { [key: string]: string } };
}

export function ShareDialog({ item, isOpen, onClose, dict }: ShareDialogProps) {
  const t = (key: string) => dict?.common?.[key] || key;
  const [isCopied, setIsCopied] = React.useState(false);

  const shareUrl = item.url;
  const shareTitle = item.title;

  const socialPlatforms = [
    {
      name: "Facebook",
      icon: <Facebook className="w-6 h-6" />,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        shareUrl
      )}`,
    },
    {
      name: "Twitter",
      icon: <Twitter className="w-6 h-6" />,
      url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(
        shareUrl
      )}&text=${encodeURIComponent(shareTitle)}`,
    },
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success(t("success_copy"));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("share_track")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {socialPlatforms.map((platform) => (
              <a
                key={platform.name}
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                {platform.icon}
                <span className="font-medium">{platform.name}</span>
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="w-full p-2 border rounded"
            />
            <Button onClick={handleCopy} size="icon" variant="outline">
              {isCopied ? (
                <Copy className="w-5 h-5 text-green-500" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
        <DialogClose asChild>
          <Button variant="outline" className="mt-4 w-full">
            {t("close")}
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
