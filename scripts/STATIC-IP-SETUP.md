# Give the Dapfam host a permanent IP address

The host currently gets its IP from the router automatically (DHCP), so the
address `192.168.1.214` **can change** after a reboot or router restart. When it
changes, the client shortcuts (which point at `http://192.168.1.214:3000`) stop
working. Lock the IP using ONE of the methods below.

## This machine's network details
- IP to keep:   192.168.1.214
- Subnet mask:  255.255.255.0  (/24)
- Gateway:      192.168.1.1   (the router)
- DNS:          192.168.1.1
- Adapter:      Ethernet (Realtek PCIe GBE)
- MAC address:  DC:FE:07:05:5C:FF   <-- the router matches the reservation to this

---

## Option A - Router DHCP Reservation (recommended, no admin on PC)

1. On any device on the network, open the router admin page: http://192.168.1.1
2. Log in (admin password is usually on a sticker on the router).
3. Find the setting called one of: "DHCP Reservation", "Address Reservation",
   "Static DHCP", or "Bind IP to MAC". It is usually under LAN / DHCP settings.
4. Add a reservation:
      MAC address = DC:FE:07:05:5C:FF
      IP address  = 192.168.1.214
5. Save / Apply.
6. On the host PC, refresh its lease:
      ipconfig /release
      ipconfig /renew
   (or just reboot the PC).

The host will now always receive 192.168.1.214. Nothing else to change -
the client shortcuts keep working.

---

## Option B - Static IP on the PC (needs Administrator)

Only if you cannot use the router. Pick an IP OUTSIDE the router's DHCP range
to avoid conflicts (ask whoever manages the router for the range). Then, in an
**Administrator** PowerShell:

    netsh interface ip set address name="Ethernet" static 192.168.1.214 255.255.255.0 192.168.1.1
    netsh interface ip set dns name="Ethernet" static 192.168.1.1

To undo (go back to automatic):

    netsh interface ip set address name="Ethernet" dhcp
    netsh interface ip set dns name="Ethernet" dhcp

---

## If the IP ever does change
Re-point the client machines by re-running the client installer with the new URL:

    install-client-shortcut.cmd http://<new-ip>:3000
