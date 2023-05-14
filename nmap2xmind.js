#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { parseStringPromise } = require('xml2js');
const { Workbook, Topic, Zipper } = require('xmind');

async function bufferFile(relPath) {
  return await fs.readFile(path.join(process.cwd(), relPath), { encoding: "utf8" });
}

async function writeFile(filepath, data) {
  await fs.writeFile(path.join(process.cwd(), filepath), JSON.stringify(data, null, 2));
}

function createWorkbookFromData({ nmaprun }) {
  const workbook = new Workbook();
  const topic = new Topic({
    sheet: workbook.createSheet("sheet title", "HOSTS"),
  });

  topic.on().note(
    `Scan type: ${nmaprun.$.args} \nScan time: ${nmaprun.$.startstr}\n${nmaprun.runstats[0].finished[0].$.summary}`
  );

  if (!nmaprun.host) {
    throw new Error("No hosts found");
  }

  const alive_hosts = nmaprun.host.filter(host => host.status[0].$.state === 'up');
  alive_hosts.forEach(host => {
    topic.on().add({ title: host.address[0].$.addr });
  });

  return { workbook, topic, alive_hosts };
}

function addPortsToWorkbook(topic, alive_hosts) {
  alive_hosts.forEach(host => {
    host.ports[0].port.forEach(port => {
      const portTitle = `${port.service[0].$.name} (${port.$.portid}/${port.$.protocol}) | ${port.state[0].$.state}`;
      topic.on(topic.cid(host.address[0].$.addr)).add({ title: portTitle });

      if (port.script) {
        port.script.forEach(script => {
          topic.on(topic.cid(portTitle)).add({ title: script.$.id });
          topic.on(topic.cid(script.$.id)).note(script.$.output);
        });
      }
    });
  });
}

async function saveWorkbook(zipper) {
  const status = await zipper.save();
  return status;
}


async function main(inputData, filename = 'pipe') {
  const result = await parseStringPromise(inputData, { trim: true });

  // await writeFile(`./${filename}.json`, result);

  const { workbook, topic, alive_hosts } = createWorkbookFromData(result);
  addPortsToWorkbook(topic, alive_hosts);

  console.log(`Total hosts: ${alive_hosts.length}`);
  alive_hosts.forEach(host => {
    console.log(`Number of open ports for ${host.address[0].$.addr} : (${host.ports[0].port.length})`);
  });

  const zipper = new Zipper({
    path: process.cwd(),
    workbook,
    filename: `${filename}.xmind`,
  });

  const saveStatus = await saveWorkbook(zipper);
  if (saveStatus) console.log(`Saved  as ${filename}.xmind`);
}



// check if argument is passed
if (process.argv.length >= 3) {
  const xml_nmap_file = process.argv[2];
  bufferFile(xml_nmap_file)
    .then(data => main(data, xml_nmap_file))
    .catch(console.error);
} else {
  // handle pipe
  let data = '';
  process.stdin.setEncoding('utf8');

  process.stdin.on('readable', () => {
    let chunk;
    while ((chunk = process.stdin.read()) !== null) {
      data += chunk;
    }
  });

  process.stdin.on('end', () => {
    main(data).catch(console.error);
 
  });
}
