---
title: Open Web UI on a Raspberry Pi
description: Notes on installing Open Web UI on a Raspberry Pi
pubDate: 2025-04-06
updatedDate: 2025-04-06
featured: false
tags:
  - note
  - ai
  - Raspberry Pi
---

I'm experimenting with using a Raspberry Pi 5 as a gateway to AI in my homelab.
The idea is to get Open Web UI running on the Pi and tunneling into that so I
can chat with my local AI away from home. While the Pi can't run larger models,
it should handle some of the lighter ones and I'm curious how adequate that is
with a little MCP magic like enabling my Pi to ground the small models with
documentation and web searches. A later phase will be wiring up my mac and maybe
a cloud offering or two so I can leverage those via my Pi.

I have Coolify set up and encountered a few configuration issues that
tripped me up.

First off, the ollama service needed to be configured so it could listen to
external requests.

The documentation mentions adding the following:

```sh
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
```

However, running `system edit ollama.service` didn't open the file in an editor
for me. Instead, I found it at:

```sh
/etc/systemd/system/ollama.service
```

Another challenge was enabling Open WebUI in a Docker context to access Ollama
running on the host. The documentation suggests passing this argument to `docker
run`:

```sh
--add-host=host.docker.internal:host-gateway
```

However, since we're using Docker Compose, we need the following YAML instead
(note that this is not a one-to-one replacement):

```yaml
extra_hosts:
  - host.docker.internal:host-gateway
```

Another issue was safely exposing this service to the outside world via
Cloudflare. This usually works, but not this time. The screen looked like it had
failed, but all I had to do was disable Chunk Encoding in the settings.

I also encountered an issue with Searxng:

- pi5.local:8009
- https://<search.domain.com>/search?q=<query>

For Cloudflare to work, I needed to make some adjustments as mentioned in [this GitHub issue](https://github.com/open-webui/open-webui/issues/2717).
