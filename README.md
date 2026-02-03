# ha-thread-vis

Home Assistant custom integration for visualizing Thread network topology in a sidebar panel.

## Features

- HACS-ready custom integration.
- Sidebar panel showing a force-directed Thread graph.
- Service + websocket endpoint to update the network graph.

## Installation (HACS)

1. Add this repository as a custom repository in HACS (type: Integration).
2. Install **Thread Network Visualization**.
3. Restart Home Assistant.
4. Open the **Thread Network** panel in the sidebar.

## Usage

### Update the network graph

Use the `ha_thread_vis.set_network` service to replace the network data:

```yaml
service: ha_thread_vis.set_network
data:
  nodes:
    - id: border_router
      label: Border Router
      group: router
    - id: leader
      label: Thread Leader
      group: leader
    - id: sensor_1
      label: Sensor 1
      group: device
  edges:
    - source: border_router
      target: leader
    - source: leader
      target: sensor_1
```

### Fetch the network graph

The panel uses the websocket command `ha_thread_vis/get_network` to fetch the current data.

## Development notes

- Static assets live in `custom_components/ha_thread_vis/static`.
- The web component is `ha-thread-vis-panel`.

## License

MIT License. See [LICENSE](LICENSE).
