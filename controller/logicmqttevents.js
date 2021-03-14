/**
 * Events from app.logicmqtt
 */
const debug = require('debug')(`linto-client:logicmqtt:events`)
//Shell execution
const child_process = require('child_process')
const exec = child_process.exec

function logicMqttEvents(app) {
    if (!app.localmqtt || !app.logicmqtt) return

    app.logicmqtt.on("logicmqtt::message", async (payload) => {
        debug("Received %O", payload)
        /******************
         * Utility messages
         ******************/
        if (!!payload.topicArray && payload.topicArray[3] === "ping") {
            app.logicmqtt.publish("pong", {}, 0, false, true)
        }

        if (!!payload.topicArray && payload.topicArray[3] === "mute") {
            app.logicmqtt.publish("muteack", {}, 0, false, true)
            app.localmqtt.publish("mute", {}, 0, false, true)
        }

        if (!!payload.topicArray && payload.topicArray[3] === "unmute") {
            app.logicmqtt.publish("unmuteack", {}, 0, false, true)
            app.localmqtt.publish("unmute", {}, 0, false, true)
        }

        if (!!payload.topicArray && payload.topicArray[3] === "volume") {
            app.localmqtt.publish("volume", { "value": payload.value }, 0, false, true)
        }

        if (!!payload.topicArray && payload.topicArray[3] === "endvolume") {
            try {
                if (payload.value) {
                    // Update memory version of this.terminal configuration (linto.json)
                    app.terminal.info.config.sound.volume = parseInt(payload.value)
                    await app.terminal.save() // dumps linto.json down to disk
                    app.logicmqtt.publishStatus()
                } else {
                    console.error("Error while trying to update volume")
                }
            } catch (e) {
                console.error(e)
            }
        }

        if (!!payload.topicArray && payload.topicArray[3] === "startreversessh") {
            try {
                await startReverseSsh(payload.remoteHost, payload.remoteSSHPort, payload.mySSHPort, payload.remoteUser, payload.privateKey)
                app.logicmqtt.publish("startreversessh", { "reversesshstatus": "ok" }, 0, false, true)
            } catch (e) {
                console.error(e)
                app.logicmqtt.publish('startreversessh', { "status": e.message }, 0, false, true)
            }
        }

        if (!!payload.topicArray && payload.topicArray[3] === "shellexec") {
            try {
                let ret = await shellExec(payload.cmd)
                app.logicmqtt.publish("shellexec", { "stdout": ret.stdout, "stderr": ret.stderr }, 0, false, true)
            } catch (e) {
                console.error(e.err)
                app.logicmqtt.publish('shellexec', { "status": e.message }, 0, false, true)
            }
        }


        if (!!payload.topicArray && payload.topicArray[3] === "tts_lang" && !!payload.value) {
            try {
                const availableTTS = process.env.TTS_LANG.split(',')
                if (payload.value && availableTTS.includes(payload.value)) {
                    // Update memory version of this.terminal configuration (linto.json)
                    app.terminal.info.config.sound.tts_lang = payload.value
                    await app.terminal.save() // dumps linto.json down to disk
                    app.logicmqtt.publishStatus()
                    app.localmqtt.publish("tts_lang", { "value": payload.value }, 0, false, true)
                } else {
                    console.error("Unsupported TTS value")
                }
            } catch (e) {
                console.error(e)
            }
        }

        if (!!payload.topicArray && payload.topicArray[3] === "say") {
            // Basic say for demo purpose
            app.localmqtt.publish("say", {
                "value": payload.value,
                "on": new Date().toJSON()
            }, 0, false, true)
        }

        /******************
         * Audio handlings
         ******************/
        // NLP file Processed
        if (!!payload.topicArray && payload.topicArray[3] === "nlp" && payload.topicArray[4] === "file" && !!payload.topicArray[5]) {
            // Do i still wait for this file to get processed ?
            if (app.audio.nlpProcessing.includes(payload.topicArray[5])) {
                app.audio.nlpProcessing = app.audio.nlpProcessing.filter(e => e !== payload.topicArray[5]) //removes from array of files to process
                // Single command mode
                if (!!payload.behavior.say) {
                    debug("conversationData reset")
                    app.conversationData = {}
                    debug(`Saying : ${payload.behavior.say.text}`)
                    app.localmqtt.publish("say", {
                        "value": payload.behavior.say.text,
                        "on": new Date().toJSON()
                    }, 0, false, true)
                    // Conversational mode
                } else if (!!payload.behavior.ask && !!payload.behavior.conversationData) {
                    app.conversationData = payload.behavior.conversationData
                    debug("conversationData sets to : " + app.conversationData)
                    debug(`asking : ${payload.behavior.ask.text}`)
                    app.localmqtt.publish("ask", {
                        "value": payload.behavior.ask.text,
                        "on": new Date().toJSON()
                    }, 0, false, true)
                }
            } else return
        }
    })
}

function startReverseSsh(remoteHost, remoteSSHPort, mySSHPort = 22, remoteUser, privateKey) {
    console.log(`${new Date().toJSON()} Starting reverse SHH :`, remoteHost, remoteSSHPort, mySSHPort, remoteUser, privateKey)
    mySSHPort = parseInt(mySSHPort)
    remoteSSHPort = parseInt(remoteSSHPort)
    return new Promise((resolve, reject) => {
        //MUST SET UP SSH KEY FOR THIS TO WORK
        //WARNING !!! OMAGAD !!!
        let cmd = `ssh -o StrictHostKeyChecking=no -NR ${remoteSSHPort}:localhost:${mySSHPort} ${remoteUser}@${remoteHost} -i ${privateKey}`
        let proc = exec(cmd, function (err, stdout, stderr) {
            if (stderr) console.error(`${new Date().toJSON()} ${stderr}`)
            if (err) return reject(err)
            return resolve(stdout)
        })
    })
}

//execute arbitrary shell command
function shellExec(cmd) {
    return new Promise((resolve, reject) => {
        var proc = exec(cmd, function (err, stdout, stderr) {
            if (err) reject(err)
            var ret = {}
            ret.stdout = stdout
            ret.stderr = stderr
            resolve(ret)
        })
    })
}


module.exports = logicMqttEvents