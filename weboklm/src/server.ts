import express from 'express'
import yaml from 'js-yaml'
import fs from 'fs'
import dotenv from 'dotenv'
import { execFile } from 'child_process'

dotenv.config()
const PARLE_COMMAND = process.env.PARLE_COMMAND || "/home/pi/parle.py"
const POLITESSE_FILE = process.env.POLITESSE_FILE || "/home/pi/politesse.yaml"
const STATIC_DIR = process.env.STATIC_DIR || './front/build'

console.log(`PARLE_COMMAND=${PARLE_COMMAND}\nPOLITESSE_FILE=${POLITESSE_FILE}\nSTATIC_DIR=${STATIC_DIR}`)


enum Category {
    BONJOURS = "bonjours",
    BLAGUES = "blagues",
    AUREVOIRS = "aurevoirs"
  }
  
type Politesse = { [c in Category]: string[] }

function load() : Politesse {
    return yaml.load(fs.readFileSync(POLITESSE_FILE, "utf8"));
}

function save(data: Politesse) {
    fs.writeFileSync(POLITESSE_FILE, yaml.dump(data))
}

const app = express();
app.use(express.json());

async function execFileAsPromise(file : string, args : string[]) {
    return new Promise((resolve, reject) => {
        execFile(file, args, (error, stdout, stderr) => {
            if (error) {
                console.warn(error);
            }
            console.log(stdout)
            console.log(stderr)
            resolve(stdout ? stdout : stderr);
        });
    });
}

async function parle(phrase : string) {
    const command = PARLE_COMMAND.split(/\s+/)
    return execFileAsPromise(command[0], [...command.slice(1), phrase])
}

app.get('/politesse', (req, res) => {
    res.send(JSON.stringify(load()))
});

app.post('/politesse', async (req, res) => {

    const { category, phrase} = req.body;

    try {
        const output = await parle(phrase)
        const data = load()
        data[category as Category].push(phrase as string)
        save(data)
        res.send(JSON.stringify({ success: true, output }))
        
    }
    catch(error) {
        res.send(JSON.stringify({success: false, error: error.message}))
    }
});

app.get('/parle', async (req, res) => {

    const { phrase } = req.query;
    try {
        const output = await parle(phrase as string)
        res.send(JSON.stringify({ success: true, output }))
    }
    catch(error) {
        res.send(JSON.stringify({success: false, error: error.message}))
    }
});

app.delete('/politesse', (req, res) => {

    const { category, phrase } = req.body;

    const data = load();
    data[category as Category] = data[category as Category].filter((x : string) => x !== phrase);
    save(data);

    res.send(JSON.stringify({ success: true }))
});

app.use('/', express.static(STATIC_DIR))

app.listen(8000, () => {
    console.log('Example app listening on port 8000!')
});


export default PARLE_COMMAND;