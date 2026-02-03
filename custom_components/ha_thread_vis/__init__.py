"""The HA Thread Visualization integration."""

from __future__ import annotations

from pathlib import Path

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.components.frontend import async_register_static_path
from homeassistant.components.panel_custom import async_register_panel
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import config_validation as cv

from .const import (
    DATA_NETWORK,
    DEFAULT_NETWORK,
    DOMAIN,
    PANEL_TITLE,
    PANEL_URL,
    STATIC_MODULE,
    STATIC_PATH,
)

PLATFORMS: list[Platform] = []

NODE_SCHEMA = vol.Schema(
    {
        vol.Required("id"): cv.string,
        vol.Optional("label", default=""): cv.string,
        vol.Optional("group", default="device"): cv.string,
    }
)
EDGE_SCHEMA = vol.Schema(
    {
        vol.Required("source"): cv.string,
        vol.Required("target"): cv.string,
    }
)

SERVICE_SET_NETWORK_SCHEMA = vol.Schema(
    {
        vol.Required("nodes"): vol.All(cv.ensure_list, [NODE_SCHEMA]),
        vol.Required("edges"): vol.All(cv.ensure_list, [EDGE_SCHEMA]),
    }
)


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up the HA Thread Visualization integration."""
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN].setdefault(DATA_NETWORK, DEFAULT_NETWORK)

    static_dir = Path(__file__).parent / "static"
    async_register_static_path(hass, STATIC_PATH, str(static_dir), cache_headers=False)

    async_register_panel(
        hass,
        frontend_url_path=PANEL_URL,
        webcomponent_name="ha-thread-vis-panel",
        module_url=STATIC_MODULE,
        sidebar_title=PANEL_TITLE,
        sidebar_icon="mdi:graph",
        require_admin=False,
    )

    async def handle_set_network(call: ServiceCall) -> None:
        """Update the stored Thread network graph."""
        hass.data[DOMAIN][DATA_NETWORK] = {
            "nodes": call.data["nodes"],
            "edges": call.data["edges"],
        }

    hass.services.async_register(
        DOMAIN,
        "set_network",
        handle_set_network,
        schema=SERVICE_SET_NETWORK_SCHEMA,
    )

    websocket_api.async_register_command(hass, websocket_get_network)

    return True


@websocket_api.websocket_command({"type": f"{DOMAIN}/get_network"})
@websocket_api.async_response
async def websocket_get_network(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Return the stored Thread network graph."""
    connection.send_result(msg["id"], hass.data[DOMAIN][DATA_NETWORK])
