var asArray = require('as-array')
var exit = require('exit')
var print = require('pretty-print')

// TODO: use var R = require('ramda') for less requires
var map = require('ramda/src/map')
var filter = require('ramda/src/filter')
var pipe = require('ramda/src/pipe')
var tail = require('ramda/src/tail')
var prop = require('ramda/src/prop')
var equals = require('ramda/src/equals')
var pluck = require('ramda/src/pluck')
var flatten = require('ramda/src/flatten')
var path = require('ramda/src/path')
var defaultTo = require('ramda/src/defaultTo')
var curryN = require('ramda/src/curryN')
var head = require('ramda/src/head')
var sortBy = require('ramda/src/sortBy')
var forEach = require('ramda/src/forEach')
var join = require('ramda/src/join')
var fromPairs = require('ramda/src/fromPairs')
var repeat = require('ramda/src/repeat')

var app = require('@cli/app')
var alias = require('@cli/alias')
var handler = require('@cli/handler')
var command = require('@cli/command')
var flag = require('@cli/flag')

var DEFAULT_PADDING = 2

var typeIsAlias = pipe(prop('type'), equals('alias'))
var getAliases = pipe(
	filter(typeIsAlias),
	pluck('value'),
	flatten
)
var typeIsMeta = pipe(prop('type'), equals('meta'))
function normalizeMeta (raw) {

	var options = {}

	pipe(
		filter(typeIsMeta),
		pluck('value'),
		forEach(o => {
			options[o.type] = options[o.type] || []
			options[o.type].push(o.value)
		})
	)(raw)

	return options
}

function _usageAlias (options) {

	var customAliases = getAliases(options)
	return customAliases.length > 0 ? customAliases : ['--help', '-h']
}

var getMetaValueFor = curryN(2, (p, o) => {

	return pipe(
		path(['meta', p]),
		defaultTo([]),
		pluck('value')
	)(o)
})
var firstAlias = pipe(prop('alias'), head)
var usageTreeFor = pipe(
	defaultTo([]),
	pluck('value'),
	map(c => {

		return {
			alias: c.alias,
			description: getMetaValueFor('description', c),
			example: getMetaValueFor('example', c)
		}
	}),
	sortBy(firstAlias)
)
var printWithDescriptions = function (item) {

	print(item, {
		leftPadding: DEFAULT_PADDING,
		rightPadding: 4
	})
}
function pad (str) {

	if (str === undefined || str === null) {
		return str
	}

	return repeat(' ', DEFAULT_PADDING).join('') + str
}

var exports = module.exports = function usage () {

	// TODO: enable/disable type as command or flag

	var options = asArray(arguments)

	return app(
		flag(
			alias.apply(null, _usageAlias(options)),
			handler(function (value, context) {

				var intro = normalizeMeta(options).description
				var example = normalizeMeta(options).example
				var flags = usageTreeFor(context.tree.flag)
				var commands = pipe(
					usageTreeFor,
					map(c => [c.alias.join(', '), c.description]),
					fromPairs
				)(context.tree.command)

				var flags = pipe(
					usageTreeFor,
					map(f => [f.alias.join(', '), f.description]),
					fromPairs
				)(context.tree.flag)

				// TOOD: default to console.log, but allow options to be passed in
				//       to override that

				if (intro !== undefined) {
					console.log('')
					console.log(intro.join('\n'))
				}

				if (example !== undefined) {
					console.log('')
					console.log('Usage:' + '\n');
					console.log(pad(example.join('\n')))
				}

				if (Object.keys(commands).length > 0) {
					console.log('')
					console.log('Commands:' + '\n');
					printWithDescriptions(commands)
				}

				if (Object.keys(flags).length > 0) {
					console.log('')
					console.log('Options:' + '\n');
					printWithDescriptions(flags)
				}

				exit(0)
			})
		)()
	)()
}

exports.description = function description (input) {

	return {
		type: 'meta',
		value: {
			type: 'description',
			value: input
		}
	}
}

exports.example = function example (input) {

	return {
		type: 'meta',
		value: {
			type: 'example',
			value: input
		}
	}
}
