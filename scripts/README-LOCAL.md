# Medira — local / LAN deployment

There are two kinds of machines:

- **Host** (the main desktop): runs MongoDB **and** the app, and serves it to the LAN.
- **Client** (peripheral machines): no install — they just open the app from the host in a browser window.

---

## HOST machine

### Start everything
Double-click the **Medira** desktop icon, or run:

```
scripts\start-local.cmd
```

This starts MongoDB (if not already running), starts the app in **production**
mode bound to all network interfaces (`-H 0.0.0.0`), and opens it in a clean
"Medira" app window.

- Local URL:   http://localhost:3000
- LAN URL:     http://<host-ip>:3000   (currently http://192.168.1.214:3000)

### Auto-start at login
A **Medira** shortcut in the Windows Startup folder launches MongoDB + the app
automatically at login. To remove it, open `shell:startup` and delete `Medira.lnk`.

### After a code change — rebuild
Production mode serves a pre-built app. If the application code changes, rebuild:

```
npm run build
```

### Let other machines connect (one-time, needs admin)
Run once on the host to open the firewall for port 3000:

```
scripts\allow-network-access.cmd   (approve the UAC prompt)
```

Also recommended: give the host a **fixed IP** (router DHCP reservation or a
static IP) so the LAN URL never changes.

---

## CLIENT machines (peripherals)

On each client machine, copy `scripts\install-client-shortcut.cmd` over and run it:

```
install-client-shortcut.cmd
```

or with a custom host URL:

```
install-client-shortcut.cmd http://192.168.1.214:3000
```

This creates a **Medira** icon on that machine's desktop. Clicking it opens the
app (served by the host) in a clean window titled "Medira". The client needs
Chrome or Edge installed and must be on the same network as the host.

---

## Where things live (host)

- MongoDB program: `%LOCALAPPDATA%\mongodb\mongod.exe`
- MongoDB config:  `%LOCALAPPDATA%\mongodb\mongod.cfg`
- Data files:      `%LOCALAPPDATA%\mongodb\data`
- Logs:            `%LOCALAPPDATA%\mongodb\log\mongod.log`
- Node.js:         `%LOCALAPPDATA%\nodejs`
- DB connection:   `mongodb://127.0.0.1:27017`, database `SidGrace`

## Notes

- Served over plain HTTP on the LAN, so `COOKIE_SECURE=false` in `.env.local`
  (browsers drop Secure cookies over HTTP, which would break login on clients).
  Set it to `true` only if you move to HTTPS.
- The local database is **independent** from any online (Vercel/Atlas) database;
  data does not sync between them.
- MongoDB and Node were installed without admin rights, so the Visual C++ runtime
  DLLs were copied next to the executables. If those folders are deleted and
  reinstalled, the DLLs must be copied again (or install the VC++ Redistributable
  with admin rights for a permanent fix).
