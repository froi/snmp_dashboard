snmp_dashboard
==============

A simple dashboard to monitor, clear, and follow up SNMP alerts.

The project is devided into three areas:

Frontend - just what you'd expect, a nice looking UI (we hope) that interacts
with the REST API to access the mongoDB where all alerts are stored.

REST API - provides interaction with mongoDB for the frontend and SNMP agent.

SNMP Agent - this is what makes everything else work. this module is the one
that listens for SNMP alert sent to it by other devices. Once the alert is 
captured and parsed it stores it in a mongoDB instance for later viewing by the
frontend.

Demo site: https://snmpdashboard-cyborgcorp.rhcloud.com/
