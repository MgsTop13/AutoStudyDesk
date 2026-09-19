import "./header.scss"
import {Link} from "react-router"

export default function HeaderP(){
    return(
        <header>
            <Link to="/Home" className="link">Voltar</Link>
        </header>
    )
}