import "./header.scss";
import { Link, useLocation } from "react-router";

export default function HeaderP({ onSettingsClick }) {
    const atualPage = useLocation();
    const isHome = atualPage.pathname === "/Home";
    console.log(isHome)
    return (
        <header>
            {isHome && onSettingsClick && (
                <button
                    className="btn-settings"
                    onClick={onSettingsClick}
                    aria-label="Configurações"
                >
                    <img
                        src="/icons/settings.png"
                        alt="Configurações"
                        className="settings-icon"
                        onError={(e) => {
                            // Fallback caso a imagem não exista ainda
                            e.target.style.display = "none";
                            e.target.parentElement.innerText = "⚙️";
                        }}
                    />
                </button>
            )}

            {!isHome && (
                <Link to="/Home" className="link">← Voltar</Link>
            )}
        </header>
    );
}