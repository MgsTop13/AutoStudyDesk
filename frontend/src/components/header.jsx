import "./header.scss"
import {Link} from "react-router"

export default function HeaderP(){
    return(
        <header>
            <Link to="/">Login</Link>
            <Link to="/Home">Home</Link>
        </header>
    )
}