// Minimal GitHub JSON writer with token in code (replace placeholder below)
const OWNER = "stephanschwab";
const REPO = "Waal-of-OP";
const BRANCH = "main";
const FILE_PATH = "entries.json";
const GITHUB_TOKEN = "PASTE_YOUR_FINE_GRAINED_TOKEN_HERE"; // <-- replace and upload

const $ = id => document.getElementById(id);
const shorten = a => a ? a.slice(0,6) + "…" + a.slice(-4) : "";

let provider=null, signer=null, user=null, signed=null;

$("message").addEventListener("input", () => {
  $("count").textContent = $("message").value.length + " / 240";
  $("btnSign").disabled = !(user && $("message").value.trim().length);
});

$("btnConnect").onclick = async () => {
  try{
    if(!window.ethereum){ alert("Install MetaMask."); return; }
    await window.ethereum.request({ method:"eth_requestAccounts" });
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    user = await signer.getAddress();
    $("status").textContent = "Wallet: " + shorten(user);
    $("btnSign").disabled = !$("message").value.trim().length;
    $("hint").textContent = "Ready to sign.";
  }catch(e){
    console.error(e); alert("Cannot connect wallet.");
  }
};

$("btnSign").onclick = async () => {
  const msg = $("message").value.trim();
  if(!msg){ alert("Write a message first."); return; }
  const payload = ["Wall of OP — Offchain","Address: "+user,"Time: "+new Date().toISOString(),"Message:",msg].join("\n");
  try{
    const sig = await window.ethereum.request({ method:"personal_sign", params:[payload, user] });
    signed = { address:user, message:msg, signature:sig, timestamp:new Date().toISOString() };
    $("hint").textContent = "Signed. Ready to save.";
    $("btnSave").disabled = false;
  }catch(e){
    console.error(e); $("hint").textContent = "Signing cancelled.";
  }
};

async function ghGet(){
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`;
  const r = await fetch(url);
  if(r.status === 404) return { entries: [], sha: null };
  const j = await r.json();
  const content = atob(j.content.replace(/\n/g,""));
  return { entries: JSON.parse(content || "[]"), sha: j.sha };
}

async function ghPut(entries, sha){
  const body = {
    message: "add entry",
    content: btoa(unescape(encodeURIComponent(JSON.stringify(entries, null, 2)))),
    branch: BRANCH,
    sha
  };
  const r = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`, {
    method: "PUT",
    headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json" },
    body: JSON.stringify(body)
  });
  if(!r.ok){
    const t = await r.text();
    throw new Error("GitHub PUT failed: " + r.status + " " + t);
  }
}

$("btnSave").onclick = async () => {
  if(!signed){ alert("Sign first."); return; }
  if(GITHUB_TOKEN === "PASTE_YOUR_FINE_GRAINED_TOKEN_HERE"){
    alert("Replace GITHUB_TOKEN in save.js with your fine-grained token."); return;
  }
  try{
    $("hint").textContent = "Saving to GitHub…";
    const cur = await ghGet();
    cur.entries.push(signed);
    await ghPut(cur.entries, cur.sha);
    $("hint").textContent = "Saved to GitHub ✅";
    $("btnSave").disabled = true;
    $("message").value = ""; $("count").textContent = "0 / 240";
    await reloadList();
  }catch(e){
    console.error(e); $("hint").textContent = "Save failed: " + e.message;
  }
};

async function reloadList(){
  try{
    const cur = await ghGet();
    const list = $("list"); list.innerHTML = "";
    cur.entries.slice().reverse().forEach(e => {
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = \`<div class="row" style="justify-content:space-between">
        <div class="row"><span class="mono">\${e.address.slice(0,6)}…\${e.address.slice(-4)}</span></div>
        <div class="muted">\${new Date(e.timestamp).toLocaleString()}</div>
      </div>
      <div style="margin-top:6px">\${e.message.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br>")}</div>
      <div class="muted" style="margin-top:6px">sig: \${e.signature.slice(0,18)}…</div>\`;
      list.appendChild(div);
    });
    $("hint").textContent = "Loaded entries.";
  }catch(e){
    console.error(e); $("hint").textContent = "Cannot load entries (check repo exists and entries.json is present).";
  }
}

$("btnReload").onclick = reloadList;
reloadList();
