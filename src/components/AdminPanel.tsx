import { Link } from "react-router"
export default function AdminPanel({onClose}:{onClose:()=>void}) { return <div><Link to="/admin">Secure administrator sign-in</Link><button onClick={onClose}>Close</button></div> }
