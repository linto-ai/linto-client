const moduleName = 'terminal'
const debug = require('debug')(`linto-client:${moduleName}`)
const _ = require('lodash')
const network = require('network')
const ora = require('ora')
const fs = require('fs')

class Terminal {
    constructor() {
        // This LinTO terminal
        try {
            this.info = require('./linto.json')
            network.get_interfaces_list((err, interfaces) => {
                if (err) {
                    console.error(`${new Date().toJSON()} Network info unavailable`)
                    return this.info.config.network = []
                }
                this.info.config.network = interfaces
            })

        } catch (e) {
            console.error("Seems like this LinTO does not have a /lib/terminal/linto.json configuration file...")
            process.exit()
        }
    }

    async save() {
        return new Promise((resolve, reject) => {
            try {
                const formattedJson = JSON.stringify(this.info, null, 2) //keep JSON formatting
                fs.writeFile(process.cwd() + '/lib/terminal/linto.json', formattedJson, (e) => {
                    if (e) throw e
                    debug('Config written to disk')
                    return resolve()
                });
            } catch (e) {
                return reject(e)
            }
        })
    }
}

module.exports = new Terminal()