# SAAS-CORE-API — Contrat du tableau réutilisable frontend

**Date :** 2026-09-02  
**Statut :** règle d’architecture frontend obligatoire

## 1. Décision

Le frontend ne doit pas recréer la structure HTML d’un tableau dans chaque feature.

La primitive commune de référence est :

```text
frontend/src/components/data-display/data-table.jsx
```

Elle porte la structure générique :

```text
scroll horizontal
→ table
→ thead
→ colonnes
→ tbody
→ lignes
→ cellules
```

Les features fournissent uniquement :

- les données dynamiques ;
- la définition de leurs colonnes ;
- la clé de ligne ;
- le rendu métier de chaque cellule ;
- les éventuelles classes réellement spécifiques au tableau concerné.

## 2. Responsabilités

### `DataTable`

Responsable de :

- la structure HTML commune ;
- la sémantique `table / thead / th / tbody / tr / td` ;
- le conteneur responsive horizontal ;
- les espacements des cellules ;
- les styles communs de tableau ;
- l’itération sur les données et les colonnes.

### Feature métier

Responsable de :

- choisir les colonnes visibles ;
- formater les données métier ;
- appliquer les permissions UX ;
- fournir les actions possibles ;
- ouvrir Drawer/Dialog ou déclencher une mutation ;
- gérer loading, error, empty et pagination autour du tableau lorsque nécessaire.

La feature ne doit pas recréer `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>` et `<td>` tant que le besoin reste compatible avec `DataTable`.

## 3. Actions de tableau

Le groupe d’actions partagé est :

```text
DataTableActions
```

Il centralise l’espacement horizontal entre actions. La feature conserve uniquement les boutons et leurs règles de permission.

## 4. Point unique de réglage des espacements

Les valeurs actuelles restent dans :

```text
frontend/src/components/data-display/data-table-styles.js
```

Valeurs au 2026-09-02 :

```js
const DATA_TABLE_STYLES = Object.freeze({
  headerCell: 'px-5 py-3',
  bodyCell: 'px-5 py-4',
  actionGroup: 'gap-2',
});
```

Pour modifier plus tard la densité de tous les tableaux utilisant la primitive partagée, c’est ce fichier qu’il faut modifier. Les espacements ne doivent pas être copiés dans les features.

## 5. Tableaux Core migrés

Les tableaux Core suivants utilisent la primitive commune :

- Rôles ;
- Membres ;
- Fichiers ;
- Audit Workspace.

Les futurs tableaux Platform de F9 devront également utiliser `DataTable` par défaut.

## 6. Exception

Une feature ne peut créer une autre primitive de tableau que si `DataTable` ne couvre réellement pas son besoin, par exemple une grille virtualisée massive ou une interaction structurellement différente.

Dans ce cas :

1. le besoin doit être explicite ;
2. l’évolution de `DataTable` doit être étudiée en premier ;
3. la nouvelle primitive doit rester dans `components/data-display/` si elle est transversale ;
4. la duplication locale d’un tableau complet dans une page n’est pas une solution acceptable.

## 7. Règle pour F8-AUDIT et F9

Pendant `F8-AUDIT`, rechercher toute occurrence résiduelle de structure de tableau locale et vérifier qu’elle est justifiée.

Pendant F9 Platform, les pages fournissent les données et colonnes à la primitive commune ; elles ne reconstruisent pas chacune leur propre tableau.
