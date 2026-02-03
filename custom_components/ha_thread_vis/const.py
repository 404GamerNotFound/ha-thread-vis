"""Constants for the HA Thread Visualization integration."""

DOMAIN = "ha_thread_vis"
PANEL_URL = "ha_thread-vis"
PANEL_TITLE = "Thread Network"
STATIC_PATH = "/ha_thread_vis_static"
STATIC_MODULE = f"{STATIC_PATH}/panel.js"
DATA_NETWORK = "network"

DEFAULT_NETWORK = {
    "nodes": [
        {"id": "border_router", "label": "Border Router", "group": "router"},
        {"id": "leader", "label": "Thread Leader", "group": "leader"},
        {"id": "sensor_1", "label": "Sensor 1", "group": "device"},
        {"id": "sensor_2", "label": "Sensor 2", "group": "device"},
    ],
    "edges": [
        {"source": "border_router", "target": "leader"},
        {"source": "leader", "target": "sensor_1"},
        {"source": "leader", "target": "sensor_2"},
    ],
}
