import { useEffect, useState } from "react";

function App() {
    const [backendStatus, setBackendStatus] = useState("Loading...");

    useEffect(() => {
        fetch("http://localhost:5000/health")
            .then((response) => {
                return response.json();
            })
            .then((data) => {
                setBackendStatus(data.status);
            })
            .catch((error) => {
                setBackendStatus("ERROR");
                console.log(error);
            });
    }, []);

    return (
        <main>
            <h1>Backend Status</h1>
            <p>{backendStatus}</p>
        </main>
    );
}

export default App;
