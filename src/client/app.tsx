import NotFound from "@/app/not-found";
import Chat from "@/client/chat";
import Home from "@/client/home";
import Settings from "@/client/settings";
import SharedChat from "@/client/shared-chat";
import { BrowserRouter, Route, Routes } from "react-router";

export default function App() {
    return (
        <BrowserRouter>
            {/* <Layout> */}
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/chat/:id" element={<Chat />} />
                <Route path="/shared/:id" element={<SharedChat />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
            {/* </Layout> */}
        </BrowserRouter>
    );
}
