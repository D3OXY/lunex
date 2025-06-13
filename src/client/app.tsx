import NotFound from "@/app/not-found";
import Chat from "@/client/chat";
import Home from "@/client/home";
import { BrowserRouter, Route, Routes } from "react-router";

export default function App() {
    return (
        <BrowserRouter>
            {/* <Layout> */}
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/chat/:id" element={<Chat />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
            {/* </Layout> */}
        </BrowserRouter>
    );
}
