# Host availability recovery

This independent systemd timer checks Tailscale's coordination connection, Monolith's local API health, and its public HTTPS endpoint every minute. After three consecutive failed checks it can restart Tailscale, or restart the existing Monolith API and gateway containers when their database is healthy. It never recreates containers, changes images, runs migrations, resets credentials, or restarts the database.

Recovery waits for internet connectivity, observes a ten-minute cooldown per component, and allows at most three recovery attempts per hour. Tailscale sign-in and approval requests require an operator. Container recovery pauses when the updater is busy or its state cannot be verified. Existing Docker restart policies handle process crashes independently.

Install the Python script as `/usr/local/sbin/monolith-availability`, the example configuration as `/etc/monolith-availability.json`, and both units in `/etc/systemd/system/`. The host needs Python 3, curl, Tailscale, Docker, systemd, and the existing Monolith updater configuration. Configure the actual public and local health URLs before enabling the timer:

```sh
sudo systemd-analyze verify /etc/systemd/system/monolith-availability.service /etc/systemd/system/monolith-availability.timer
sudo systemctl daemon-reload
sudo systemctl enable --now monolith-availability.timer
sudo systemctl start monolith-availability.service
sudo /usr/local/sbin/monolith-availability --check
sudo journalctl -u monolith-availability.service --since today
```

State and restart limits persist in `/var/lib/monolith-availability/state.json`. The timer starts three minutes after boot to allow the database and network to initialize. Both units and the script persist across app updates.

For planned host maintenance, create `/run/monolith-availability.pause`. Remove that file when maintenance is complete. To disable recovery entirely, stop and disable `monolith-availability.timer`.

Run the recovery policy tests with `pnpm exec python -m unittest discover -s release/availability -p test_availability.py`. Live acceptance tests on OptiPlex stopped Tailscale over the independent wired SSH connection and stopped the Monolith gateway separately. In both cases, three health cycles triggered recovery and restored public HTTPS. The gateway test verified unchanged images, container IDs and storage mounts, with no database restart. Windows and macOS access passed afterward. Controlled-test restart counters were archived and cleared before returning the monitor to normal operation.
