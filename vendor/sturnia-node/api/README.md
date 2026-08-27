# vendor/sturnia-node/api

Letterlijke kopie van `src/api/` uit **@starling-cloud/sturnia-node**
(https://github.com/starling-cloud/sturnia-node) — de `BiblioClient`-adapter
die de biblio-API van coco-biblio spreekt (BIBLIO-CONTRACT.md §3/§10).

Waarom gekopieerd en niet als npm-dependency of submodule: sturnia-node is een
privérepo. Een submodule zou betekenen dat óók de server waarop dit prototype
draait GitHub-credentials nodig heeft. Met deze kopie is `npm install` genoeg.

Bijwerken:

    cp ../../sturnia-node/src/api/{index,client,types}.ts .

Niets hier met de hand aanpassen — wijzigingen horen upstream thuis.
