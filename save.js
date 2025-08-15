// Minimal GitHub JSON writer — token вводиться через prompt, не зберігається в коді
const OWNER = "stephanschwab";
const REPO = "Waal-of-OP";
const BRANCH = "main";
const FILE_PATH = "entries.json";

let provider, signer, walletAddress, signedMessage;

// Отримати або запросити токен
function getToken() {
    let token = localStorage.getItem("github_token");
    if (!token) {
        token = prompt("Введіть свій GitHub fine-grained token (з доступом Read/Write до Contents)");
        if (token) {
            localStorage.setItem("github_token", token);
        } else {
            alert("Токен не введено — неможливо зберегти дані.");
        }
    }
    return token;
}

// Очистити токен (вихід)
function clearToken() {
    localStorage.removeItem("github_token");
    alert("Токен видалено з браузера.");
}

document.getElementById("btnConnect").onclick = async () => {
    if (!window.ethereum) { alert("Встановіть MetaMask."); return; }
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    walletAddress = await signer.getAddress();
    alert("Підключено: " + walletAddress);
};

document.getElementById("btnSign").onclick = async () => {
    const message = document.getElementById("message").value.trim();
    if (!message) { alert("Введіть повідомлення"); return; }
    signedMessage = await signer.signMessage(message);
    alert("Повідомлення підписано ✅");
};

document.getElementById("btnSave").onclick = async () => {
    const token = getToken();
    if (!token) return;

    const message = document.getElementById("message").value.trim();
    if (!message || !signedMessage) {
        alert("Введіть і підпишіть повідомлення перед збереженням.");
        return;
    }

    const apiUrl = https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH};
    const res = await fetch(apiUrl, { headers: { Authorization: token ${token} } });
    const data = await res.json();
    const content = atob(data.content);
    const json = JSON.parse(content);

    json.push({
        address: walletAddress,
        message: message,
        signature: signedMessage,
        timestamp: new Date().toISOString()
    });

    const newContent = btoa(JSON.stringify(json, null, 2));

    await fetch(apiUrl, {
        method: "PUT",
        headers: {
            Authorization: token ${token},
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: "Add new Wall-of-OP entry",
            content: newContent,
            sha: data.sha,
            branch: BRANCH
        })
    });

    alert
};
