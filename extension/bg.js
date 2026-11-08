// Background: sync Freedom's session history every hour and when Chrome starts.
importScripts('lib.js');

async function run() {
  await syncFreedom();
  const { error } = await store.get();
  chrome.action.setBadgeText({ text: error ? '!' : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#c93a3a' });
}

chrome.alarms.create('sync', { periodInMinutes: 60, delayInMinutes: 1 });
chrome.alarms.onAlarm.addListener(a => a.name === 'sync' && run());
chrome.runtime.onStartup.addListener(run);
chrome.runtime.onInstalled.addListener(run);
// The popup asks for a sync when it opens and its data is stale.
chrome.runtime.onMessage.addListener((msg, _, reply) => {
  if (msg === 'sync') { run().then(() => reply(true)); return true; }
});
