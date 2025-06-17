import { SharedChatView } from "@/components/chat/SharedChatView"

export default function SharePage({
  params,
}: {
  params: { shareId: string }
}) {
  return <SharedChatView shareId={params.shareId} />
}
