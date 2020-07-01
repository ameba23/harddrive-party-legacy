## metadb - distributed media file index and file-sharing protocol

### Status: Highly experimental

metadb is a peer-to-peer database of media file metadata. Peers can extract information about their media files and replicate this data with other peers, to create a searchable distributed database of all known files.

metadb aims to be transport agnostic - the focus of the project is on providing a metadata index - actual transfer of the files could be done by whichever protocol you choose, for example Gnutella, IPFS, DAT, or Bittorrent links could be included in the index. However, a simple encrypted file transfer system is also included.

It also aims to be extendible - arbitrary data can be published about files, which might include comments, reviews, 'stars', links to web resources, or integration with local media libraries such as calibre or music player daemon.

It has an HTTP API and a simple web interface, meaning it can also be run on an ARM device, NAS, or other remote machine.

![screenshot metadb ui](http://ameba.ehion.com/download/metadb-screenshot1.png)

![screenshot metadb ui](http://ameba.ehion.com/download/metadb-screenshot2.png)

### Why?

There are many great peer-to-peer systems for publishing and downloading files, but not so many of them provide a distributed index. In some cases files get shared only with specific individuals, and in other cases they are listed on a centralised index.

Some projects, like Gnutella, provide a peer-to-peer mechanism for searching for files, but the difference here is that the entire index is transferred up-front, rather than specific requests propagating over the network.  This means that searches are fast, and the index can be browsed when offline.

Another difference is that metadb has a system of private and semi-private groups, which can overlap. You can only transfer files with a peer you are actually connected to by both knowing the same 'topic' on the DHT. But indexes are 'gossiped' over indirect connections. So you can browse the indexes of a wider community of peers than you are currently connected to.

The hope is that having semi-private communities will bring a sense of responsibility and accountability whilst still allowing new peers to discover content. There is also a possibility to have more closed groups (where index entries are encrypted to the group key), as well as allow-lists and block-lists for specific peers.

### How does it work?

It is largely based on the DAT/hyper stack with a few peculiarities.

Peers meet through joining a topic on the hyperswarm DHT, which could be the hash of a commonly know word or phrase, or a key chosen a random.  The topic key is hashed (giving the 'discovery key') and knowledge of the original key is proved in a handshake, which also establishes the key used to sign entries to the peer's list of files - which is a hypercore append-only log.

Each connection between two peers comprises of two encrypted streams, one for replicating indexes using 'multifeed',  and one for transferring files.

Since it is mostly based on the hyper stack, you might wonder why files are not transferred using hyperdrive.  As of hyperdrive 10, it is difficult to include files in a hyperdrive which are actually stored as normal files on disk.  Metadb is designed for sharing large media collections, and requiring people to either duplicate their collection or access them through a hyperdrive seems too restrictive. This might change though.

You might also wonder why use a custom handshake and not NOISE. We want to establish a signing key, and noise is based only on diffie-hellman. But its possible to add a custom payload to a noise handshake, and perhaps thats what will happen, especially if people want the reassurance of using an established protocol, but for now this uses a custom handshake.

### Features

- Database built on [kappa-core](https://github.com/kappa-db/kappa-core)
- Replicate with the database of others to produce a collective database of file metadata - using the `hyperswarm` DHT for peer discovery.
- Pluggable metadata extractors. Included are:
  - [Exiftool](https://www.sno.phy.queensu.ca/~phil/exiftool/) - built for images but extracts data from a wide variety of other types of files.  Requires the script to be installed externally.  `exif-keys.json` specifies a list of attributes from exiftool that we would like to index.
  - [music-metadata](https://github.com/borewit/music-metadata)
  - `pdf-text` which extracts text from PDFs using [pdf2json](https://github.com/modesty/pdf2json)
  - [image-size](https://github.com/image-size/image-size)

This module is an http API exposing the functionality from [metadb-core](https://github.com/ameba23/metadb-core), and the web based front end, [metadb-ui](https://github.com/ameba23/metadb-ui). A simple command-line interface is also included.

### Installation and usage

- Install globally with npm or yarn, eg: `npm i -g metadb`
- Run `metadb start`
- You should see a link to the web interface served on `localhost`. The default port is `2323`.
- To get started, you probably want to index some media files, by clicking 'shares' in the web interface, or typing `metadb index <directory>` in another terminal window.
- To connect to other users and merge databases, you need to connect to a swarm, on the 'connection' page.
Here you can type a name which will be hashed to give a topic on the DHT to find other peers.  There are currently no known public swarms.
- You can request files of other peers. Active transfers are not yet displayed in the interface very well, you should be able to see some output in the terminal window running to API.

If you want the process to run indefinitely, you can create a systemd service, or run with `pm2` or `forever`. 

metadb is based on an older unfinished python project, [meta-database](https://github.com/ameba23/meta-database). 

![AGPL3](https://www.gnu.org/graphics/agplv3-with-text-162x68.png)
