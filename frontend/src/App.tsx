import { BrowserRouter, Route, Routes } from "react-router-dom";

import Footer from "./components/Footer";
import Header from "./components/Header";

import About from "./pages/About";
import Contact from "./pages/Contact";
import Dashboard from "./pages/Dashboard";
import ErrorPage from "./pages/Error";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Register from "./pages/Register";
import Search from "./pages/Search";
import Terms from "./pages/Terms";

function App() {
    return (
        <BrowserRouter>
            <Header />

            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/about" element={<About />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/register" element={<Register />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/search" element={<Search />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="*" element={<ErrorPage />} />
            </Routes>

            <Footer />
        </BrowserRouter>
    );
}

export default App;
