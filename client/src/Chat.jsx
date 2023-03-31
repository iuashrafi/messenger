import { useEffect, useState, useContext, useRef } from "react";
import Logo from "./Logo";
import Contact from "./Contact";
import { uniqBy } from "lodash";
import { UserContext } from "./UserContext";
import axios from "axios";
const Chat = () => {
  // context/store
  const { username, id, setUsername, setId } = useContext(UserContext);
  // webSocket connection
  const [ws, setWs] = useState(null);
  const [onlinePeople, setOnlinePeople] = useState({});
  const [offlinePeople, setOfflinePeople] = useState({});
  const [selectedUserId, setSelectedUserId] = useState(null);
  // message
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState("");
  const divUnderMessages = useRef(null);

  // setting up  web socket
  useEffect(() => {
    connectToWs();
  }, []);
  function connectToWs() {
    const ws = new WebSocket("ws://localhost:4040");
    setWs(ws);
    ws.addEventListener("message", handleMessage);
    ws.addEventListener("close", () => {
      setTimeout(() => {
        console.log("Disconnected. Trying to reconnect.");
        connectToWs();
      }, 1000);
    });
  }

  //sending message
  const sendMessage = (ev, file = null) => {
    if (ev) ev.preventDefault();
    // alert("Sending message");
    ws.send(
      JSON.stringify({
        recipient: selectedUserId,
        text: newMessageText,
        file,
      })
    );

    if (file) {
      axios.get("/messages/" + selectedUserId).then((res) => {
        setMessages(res.data);
      });
    } else {
      setNewMessageText("");
      setMessages((prev) => [
        ...prev,
        {
          sender: id,
          recipient: selectedUserId,
          isOur: true,
          text: newMessageText,
          _id: Date.now(),
        },
      ]);
    }
  };

  useEffect(() => {
    const div = divUnderMessages.current;
    if (div) {
      div.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  useEffect(() => {
    if (selectedUserId) {
      axios.get("/messages/" + selectedUserId).then((res) => {
        // console.log(res.data);
        setMessages(res.data);
      });
    }
  }, [selectedUserId]);

  function showOnlinePeople(peopleArray) {
    // console.log(peopleArray);
    const people = {};
    peopleArray.forEach(({ userId, username }) => {
      people[userId] = username;
    });
    setOnlinePeople(people);
  }
  useEffect(() => {
    axios
      .get("/people")
      .then((res) => {
        const offlinePeopleArr = res.data
          .filter((p) => p._id !== id)
          .filter((p) => !Object.keys(onlinePeople).includes(p._id));
        // console.log("offline:", offlinePeople);

        const offlinePeople = {};
        offlinePeopleArr.forEach((p) => {
          offlinePeople[p._id] = p;
        });
        setOfflinePeople(offlinePeople);
      })
      .catch((err) => console.error(err));
  }, [onlinePeople]);

  // function handleMessage(ev) {
  //   console.log("handleMessage");
  //   const messageData = JSON.parse(ev.data);
  //   // console.log({ ev, messageData });
  //   // console.log({ ev, messageData });
  //   if ("online" in messageData) {
  //     showOnlinePeople(messageData.online);
  //   } else if ("text" in messageData) {
  //     console.log("messageData", messageData);
  //     // if (messageData.sender === selectedUserId)
  //     setMessages((prev) => [
  //       ...prev,
  //       {
  //         ...messageData,
  //       },
  //     ]);
  //   }
  // }
  function handleMessage(ev) {
    const messageData = JSON.parse(ev.data);
    console.log({ ev, messageData });
    if ("online" in messageData) {
      showOnlinePeople(messageData.online);
    } else if ("text" in messageData) {
      // if (messageData.sender === selectedUserId)  // creating some problem
      setMessages((prev) => [...prev, { ...messageData }]);
    }
  }

  function logout() {
    axios.post("/logout").then(() => {
      setWs(null);
      setId(null);
      setUsername(null);
    });
  }
  function sendFile(ev) {
    const reader = new FileReader();
    reader.readAsDataURL(ev.target.files[0]);
    reader.onload = () => {
      sendMessage(null, {
        name: ev.target.files[0].name,
        data: reader.result,
      });
    };
  }
  const onlinePeopleExclOurUser = { ...onlinePeople };
  delete onlinePeopleExclOurUser[id];

  const messagesWithoutDupes = uniqBy(messages, "_id");
  return (
    <div className="flex h-screen">
      <div className="bg-white w-1/3 py-2  flex flex-col">
        <div className="flex-grow">
          <Logo />
          {/* {Object.keys(onlinePeopleExclOurUser).map((userId) => (
          <div
            key={userId}
            onClick={() => setSelectedUserId(() => userId)}
            className={
              "border-b border-gray-100 py-2 px-2 flex items-center gap-3 cursor-pointer  " +
              (userId === selectedUserId ? " bg-blue-200" : "  ")
            }
          >
            <Avatar
              online={true}
              username={onlinePeople[userId]}
              userId={userId}
            />
            <span className="text-gray-800">{onlinePeople[userId]}</span>
          </div>
        ))} */}

          {Object.keys(onlinePeopleExclOurUser).map((userId) => (
            <Contact
              key={userId}
              id={userId}
              online={true}
              username={onlinePeopleExclOurUser[userId]}
              onClick={() => {
                setSelectedUserId(userId);
                console.log({ userId });
              }}
              selected={userId === selectedUserId}
            />
          ))}

          {Object.keys(offlinePeople).map((userId) => (
            <Contact
              key={userId}
              id={userId}
              online={false}
              username={offlinePeople[userId].username}
              onClick={() => setSelectedUserId(userId)}
              selected={userId === selectedUserId}
            />
          ))}
        </div>

        <div className="p-2 text-center">
          <button
            onClick={logout}
            className="text-sm text-gray-600 bg-blue-100 py-1 px-2 rounded-sm"
          >
            Logout
          </button>
        </div>
      </div>
      <div className="flex flex-col bg-blue-200 w-2/3 p-2">
        <div className="flex-grow">
          {!selectedUserId && (
            <div>
              &larr; Select a person
              <br />
              Current user :{username}
              <br />
              Current user id : {id}
            </div>
          )}

          {!!selectedUserId && (
            <div className="relative h-full">
              <div className="overflow-y-scroll absolute top-0 left-0 right-0 bottom-2">
                {messagesWithoutDupes.map((message) => (
                  <div
                    key={message._id}
                    className={
                      message.sender === id ? "text-right" : "text-left"
                    }
                  >
                    <div
                      className={
                        "inline-block p-2 my-2 rounded-sm text-sm " +
                        (message.sender === id
                          ? "bg-blue-500  text-white "
                          : " bg-white  text-gray-500")
                      }
                    >
                      {message.sender === id ? "ME: " : ""}
                      {message.text}
                      {message.file && (
                        <div className="">
                          <a
                            target="_blank"
                            className="flex items-center gap-1 border-b"
                            href={
                              axios.defaults.baseURL +
                              "/uploads/" +
                              message.file
                            }
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="w-4 h-4"
                            >
                              <path
                                fillRule="evenodd"
                                d="M18.97 3.659a2.25 2.25 0 00-3.182 0l-10.94 10.94a3.75 3.75 0 105.304 5.303l7.693-7.693a.75.75 0 011.06 1.06l-7.693 7.693a5.25 5.25 0 11-7.424-7.424l10.939-10.94a3.75 3.75 0 115.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 015.91 15.66l7.81-7.81a.75.75 0 011.061 1.06l-7.81 7.81a.75.75 0 001.054 1.068L18.97 6.84a2.25 2.25 0 000-3.182z"
                                clipRule="evenodd"
                              />
                            </svg>
                            {message.file}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <div ref={divUnderMessages}></div>
              </div>
            </div>
          )}
        </div>

        {!!selectedUserId && (
          <form className="flex gap-2" onSubmit={sendMessage}>
            <input
              type="text"
              name=""
              id=""
              value={newMessageText}
              onChange={(ev) => setNewMessageText(ev.target.value)}
              placeholder="Type your  message"
              className="bg-white flex flex-grow rounded-sm p-2"
            />
            <label className="bg-blue-200 p-2 text-gray-600 cursor-pointer rounded-sm border border-blue-200">
              <input type="file" className="hidden" onChange={sendFile} />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-6 h-6"
              >
                <path
                  fillRule="evenodd"
                  d="M18.97 3.659a2.25 2.25 0 00-3.182 0l-10.94 10.94a3.75 3.75 0 105.304 5.303l7.693-7.693a.75.75 0 011.06 1.06l-7.693 7.693a5.25 5.25 0 11-7.424-7.424l10.939-10.94a3.75 3.75 0 115.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 015.91 15.66l7.81-7.81a.75.75 0 011.061 1.06l-7.81 7.81a.75.75 0 001.054 1.068L18.97 6.84a2.25 2.25 0 000-3.182z"
                  clipRule="evenodd"
                />
              </svg>
            </label>

            <button
              type="submit"
              className="bg-blue-500 p-2 text-white rounded-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Chat;
