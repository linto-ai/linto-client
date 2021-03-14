const debug = require('debug')('logic-client:config')
const dotenv = require('dotenv')
const fs = require('fs')

function noop() { }

function ifHasNotThrow(element, error) {
    if (!element) throw error
    return element
}

function ifHas(element, defaultValue) {
    if (!element) return defaultValue
    return element
}

function configureDefaults() {
    try {
        dotenv.config()
        const envdefault = dotenv.parse(fs.readFileSync('.envdefault'))
        process.env.AUDIO_FILE = ifHas(process.env.AUDIO_FILE, envdefault.AUDIO_FILE)
        process.env.COMPONENTS = ifHas(process.env.COMPONENTS, envdefault.COMPONENTS)
        process.env.TTS_LANG = ifHas(process.env.TTS_LANG, envdefault.TTS_LANG)
        process.env.LOCAL_MQTT_KEEP_ALIVE = ifHas(process.env.LOCAL_MQTT_KEEP_ALIVE, envdefault.LOCAL_MQTT_KEEP_ALIVE)
        process.env.LOCAL_MQTT_ADDRESS = ifHas(process.env.LOCAL_MQTT_ADDRESS, envdefault.LOCAL_MQTT_ADDRESS)
        process.env.LOCAL_MQTT_PORT = ifHas(process.env.LOCAL_MQTT_PORT, envdefault.LOCAL_MQTT_PORT)

    } catch (e) {
        console.error(debug.namespace, e)
        process.exit(1)
    }
}
module.exports = configureDefaults()