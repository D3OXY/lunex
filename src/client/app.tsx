import Home from "@/client/home";
import { BrowserRouter, Route, Routes } from "react-router";

export default function App() {
  return (
    <BrowserRouter>
      {/* <Layout> */}
      <Routes>
        <Route path="/" element={<Home />} />
        {/* <Route path="/docs" element={<Docs />} />
                    <Route path="/examples" element={<Examples />} />
                    <Route path="/items/:id" element={<ItemDetail />} />
                    <Route path="*" element={<NotFound />} /> */}
      </Routes>
      {/* </Layout> */}
    </BrowserRouter>
  );
}
