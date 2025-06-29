import { ChatInterfaceV2Test } from "@/components/chat/chat-interface-v2-test";

export default function TestV2Page() {
	return (
		<div className="container mx-auto py-8">
			<h1 className="text-2xl font-bold mb-4">
				Vercel AI SDK v2 Integration Test
			</h1>
			<ChatInterfaceV2Test />
		</div>
	);
}
