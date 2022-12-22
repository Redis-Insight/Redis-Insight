[![Release](https://img.shields.io/github/v/release/RedisInsight/RedisInsight.svg?sort=semver)](https://github.com/RedisInsight/RedisInsight/releases)
[![CircleCI](https://circleci.com/gh/RedisInsight/RedisInsight/tree/main.svg?style=svg)](https://circleci.com/gh/RedisInsight/RedisInsight/tree/main)

# <img src="https://redis.com/wp-content/uploads/2019/11/ico-redisinsight.svg" alt="logo" width="25"/>  RedisInsight - Developer GUI for Redis, by Redis.
[![Forum](https://img.shields.io/badge/Forum-RedisInsight-red)](https://forum.redis.com/c/redisinsight/65)
[![Discord](https://img.shields.io/discord/697882427875393627?style=flat-square)](https://discord.gg/QUkjSsk)


RedisInsight is a visual tool that provides capabilities to design, develop and optimize your Redis application.
Query, analyse and interact with your Redis data. [Download it here](https://redis.com/redis-enterprise/redis-insight/#insight-form)!

![RedisInsight Browser screenshot](/.github/redisinsight_browser.png)

Built with love using [Electron](https://www.electronjs.org/), [Monaco Editor](https://microsoft.github.io/monaco-editor/) and NodeJS.

## Overview

RedisInsight is an intuitive and efficient GUI for Redis, allowing you to interact with your databases and manage your data—with built-in support for Redis modules.

### RedisInsight Highlights:

* Browse, filter, visualise your key-value Redis data structures and see key values in different formats (including JSON, Hex, ASCII, etc.)
* CRUD support for Lists, Hashes, Strings, Sets, Sorted Sets, and Streams
* CRUD support for [RedisJSON](https://oss.redis.com/redisjson/)
* Profiler - analyze every command sent to Redis in real-time
* SlowLog - analyze slow operations in Redis instances based on the [Slowlog](https://github.com/RedisInsight/RedisInsight/releases#:~:text=results%20of%20the-,Slowlog,-command%20to%20analyze) command
* Pub/Sub - support for [Redis pub/sub](https://redis.io/docs/manual/pubsub/), enabling subscription to channels and posting messages to channels
* Bulk actions - Delete the keys in bulk based on the filters set in Browser or Tree view
* Introducing Workbench - advanced command line interface with intelligent command auto-complete, complex data visualizations and support for the raw mode
* Command auto-complete support for [RediSearch](https://oss.redis.com/redisearch/), [RedisJSON](https://oss.redis.com/redisjson/), [RedisGraph](https://oss.redis.com/redisgraph/), [RedisTimeSeries](https://oss.redis.com/redistimeseries/), [RedisAI](https://oss.redis.com/redisai/)
* Visualizations of your [RediSearch](https://oss.redis.com/redisearch/) index, queries, and aggregations
* Ability to build your own data visualization plugins
* Built-in click-through guides for Redis capabilities
* Oficially supported for Redis OSS, [Redis Cloud](https://redis.com/try-free/). Works with Microsoft Azure Cache for Redis (official support upcoming).
* Available for macOS (including M1), Windows and Linux

Check out the [release notes](https://docs.redis.com/latest/ri/release-notes/).

## Get started with RedisInsight

This repository includes the code for the GA version of RedisInsight 2.0. Check out the [blogpost](https://redis.com/blog/introducing-redisinsight-2/) announcing it.

### Installable
Available to download for free from [here](https://redis.com/redis-enterprise/redis-insight/#insight-form).

### Build
Alternatively you can also build from source. See our wiki for instructions.

* [How to build](https://github.com/RedisInsight/RedisInsight/wiki/How-to-build-and-contribute)

## Feedback

* Request a new [feature](https://github.com/RedisInsight/RedisInsight/issues/new?assignees=&labels=&template=feature_request.md&title=%5BFeature+Request%5D%3A)
* Upvote [popular feature requests](https://github.com/RedisInsight/RedisInsight/issues?q=is%3Aopen+is%3Aissue+label%3Afeature+sort%3Areactions-%2B1-desc)
* File a [bug](https://github.com/RedisInsight/RedisInsight/issues/new?assignees=&labels=&template=bug_report.md&title=%5BBug%5D%3A)


## RedisInsight Plugins

With RedisInsight you can now also extend the core functionality by building your own data visualizations. See our wiki for more information.

* [Plugin Documentation](https://github.com/RedisInsight/RedisInsight/wiki/Plugin-Documentation)

## Contributing

If you would like to contribute to the code base or fix and issue, please consult the wiki.

* [How to build and contribute](https://github.com/RedisInsight/RedisInsight/wiki/How-to-build-and-contribute)

## Telemetry

RedisInsight includes an opt-in telemetry system, that is leveraged to help improve the developer experience (DX) within the app. We value your privacy, so stay assured, that all the data collected is anonymised.

## License

RedisInsight is licensed under [SSPL](/LICENSE) license.

