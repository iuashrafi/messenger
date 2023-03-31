import axios from "axios";
import { createContext, useState, useEffect } from "react";
export const UserContext = createContext({});

export function UserContextProvider({ children }) {
  const [username, setUsername] = useState(null);
  const [id, setId] = useState(null);

  useEffect(() => {
    axios.get("/profile").then((response) => {
      // console.log("Hello world");
      // console.log(response.data);

      setId((prev) => response.data.userId);
      setUsername(response.data.username);
    });
  }, []);

  return (
    <UserContext.Provider value={{ username, setUsername, id, setId }}>
      {children}
    </UserContext.Provider>
  );
}
