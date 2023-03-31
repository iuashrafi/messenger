import Register from "./components/Register";
import { useContext } from "react";
import { UserContext } from "./UserContext";
import Chat from "./Chat";

export default function Routes() {
  const { username, id } = useContext(UserContext);

  if (username) {
    return <Chat />;
  }

  return <Register />;
}
