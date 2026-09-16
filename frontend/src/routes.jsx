import {BrowserRouter, Routes, Route} from "react-router"
import Home from "./pages/home/home"
import Login from "./pages/login/login"

export default function Rota(){
    return(
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/Home" element={<Home />} />
            </Routes> 
        </BrowserRouter>
    )
}