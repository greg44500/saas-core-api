# Dette fonctionnelle — conformité RGPD, cookies, confidentialité et mentions légales

**Date d’enregistrement :** 2026-09-03  
**Statut :** DETTE FONCTIONNELLE TRANSVERSE — à cadrer puis implémenter avant mise en production  
**Périmètre :** backend + frontend + exploitation + validation juridique finale

## Objet de la dette

Cette dette regroupe les obligations et travaux nécessaires autour de :

- la gestion des cookies et autres traceurs ;
- le recueil, la mémorisation et le retrait du consentement ;
- la politique de cookies ;
- la politique de confidentialité / information RGPD ;
- les mentions légales ;
- les durées de conservation ;
- les sous-traitants et transferts hors EEE ;
- les droits des personnes et leur exercice ;
- la qualification responsable de traitement / sous-traitant dans un SaaS multi-tenant ;
- la preuve du consentement et la version de l’information présentée.

Cette dette ne doit pas être traitée par une simple bannière générique. L’ordre de travail attendu est :

```text
inventaire des traitements et traceurs
→ qualification juridique
→ bases légales et durées
→ architecture de consentement
→ modèles / endpoints / UX
→ rédaction finale des textes
→ tests de blocage, refus et retrait
→ validation juridique avant production
```

---

# Dossier de conformité avant déploiement --- SaaS multi-utilisateur

## Cookies / traceurs, mentions légales et politique de confidentialité --- France / RGPD

**Version : 2026-09-03**\
**Périmètre :** application SaaS accessible en France, exploitée par une
entreprise, avec comptes utilisateurs et traitement de données
personnelles.

> **Important --- mode d'emploi du document**
>
> Les éléments **en gras entre crochets** sont à renseigner ou à adapter
> à la situation réelle du SaaS.\
> Les obligations ne doivent pas être « personnalisées » au point de
> devenir inexactes : finalités, bases légales, destinataires, durées,
> transferts, cookies et sous-traitants doivent correspondre aux
> traitements effectivement réalisés.
>
> Ce document est un **modèle de travail fondé sur les textes officiels
> consultés**. Il ne peut pas déterminer à lui seul la conformité du
> SaaS sans connaître son entité juridique, ses traitements, ses
> prestataires, ses contrats, ses durées de conservation et ses flux
> internationaux. Une validation juridique finale est recommandée avant
> mise en production.

------------------------------------------------------------------------

# 1. Réponse courte

Pour un SaaS français, il faut distinguer trois ensembles :

1.  **La gestion des cookies et autres traceurs** : informer
    l'utilisateur et, pour les traceurs non strictement nécessaires,
    obtenir son consentement **avant** leur dépôt ou leur lecture. Le
    refus doit être aussi simple que l'acceptation et le consentement
    doit pouvoir être retiré simplement.
2.  **Les mentions légales** : identifier l'éditeur du service, le
    directeur de la publication et l'hébergeur, avec les informations
    imposées par la LCEN et les règles applicables à l'entreprise.
3.  **L'information RGPD / politique de confidentialité** : expliquer
    notamment qui traite les données, pourquoi, sur quelle base
    juridique, quelles données sont nécessaires, qui les reçoit, combien
    de temps elles sont conservées, les éventuels transferts hors EEE,
    les droits des personnes et comment les exercer.

**Il n'existe pas une liste légale de « données obligatoires à mettre
dans chaque cookie ».** L'obligation porte principalement sur
**l'information relative aux opérations de lecture/écriture et à leurs
finalités**, et sur le consentement lorsqu'il est requis. Pour la
transparence, la CNIL recommande également d'informer sur les traceurs
exemptés de consentement.

------------------------------------------------------------------------

# 2. Ce qui est obligatoire, ce qui est paramétrable

  ---------------------------------------------------------------------------
  Élément                  Statut                  Ce qui est adaptable
  ------------------------ ----------------------- --------------------------
  Identité du responsable  Obligatoire             **[raison sociale, forme,
  du traitement                                    adresse, coordonnées]**

  Finalités des            Obligatoire             **[finalités réelles du
  traitements                                      SaaS]**

  Base juridique de chaque Obligatoire             **[contrat, obligation
  traitement                                       légale, intérêt légitime,
                                                   consentement, etc., selon
                                                   le traitement réel]**

  Destinataires /          Obligatoire             **[équipes autorisées,
  catégories de                                    sous-traitants,
  destinataires                                    prestataires, autorités si
                                                   applicable]**

  Durées de conservation   Obligatoire             **[durées justifiées par
  ou critères                                      traitement]**

  Droits RGPD et modalités Obligatoire             **[email / adresse /
  d'exercice                                       formulaire de contact]**

  Coordonnées du DPO       Obligatoire si un DPO   **[coordonnées DPO]**
                           est désigné             

  Réclamation auprès de la Obligatoire dans        Formulation possible, mais
  CNIL                     l'information RGPD      le droit doit être indiqué

  Transferts hors EEE et   Obligatoire si          **[pays, mécanisme,
  garanties                applicable              garanties, moyen d'obtenir
                                                   une copie]**

  Caractère                Obligatoire au moment   **[champs obligatoires et
  obligatoire/facultatif   de la collecte          conséquences]**
  des données et                                   
  conséquences                                     

  Cookies strictement      Consentement préalable  **[liste, finalité,
  nécessaires              généralement non requis durée]** selon
                                                   l'architecture réelle

  Cookies non nécessaires  Consentement préalable  **[catégories/finalités
                           requis                  et partenaires réellement
                                                   utilisés]**

  Bouton « Tout accepter » Choix d'interface       Le refus doit rester aussi
                           possible                simple que l'acceptation

  Bouton « Tout refuser »  Nécessaire lorsqu'il    Libellé/design adaptables
  ou mécanisme équivalent  existe des traceurs     sans biaiser le choix
                           soumis au consentement  

  Paramétrage par finalité À prévoir pour un       **[catégories
                           consentement spécifique activables]**
                           lorsque plusieurs      
                           finalités existent      

  Retrait du consentement  Obligatoire lorsqu'un   **[lien/bouton permanent
                           consentement est        « Gérer mes cookies »]**
                           utilisé                

  Durée de mémorisation du À déterminer au cas par La CNIL indique qu'environ
  choix                    cas                     **6 mois** constitue
                                                   généralement une bonne
                                                   pratique

  Mentions                 Obligatoires            **[informations
  éditeur/hébergeur                                juridiques réelles]**
  ---------------------------------------------------------------------------

------------------------------------------------------------------------

# 3. Cookies et traceurs : règles à intégrer

## 3.1 Traceurs pouvant être exemptés de consentement

L'article 82 de la loi Informatique et Libertés prévoit une exemption
lorsque l'accès ou l'inscription d'informations :

-   a pour finalité exclusive de permettre ou faciliter une
    communication électronique ; ou
-   est strictement nécessaire à la fourniture d'un service en ligne
    expressément demandé par l'utilisateur.

La CNIL cite notamment comme exemples possibles : traceurs conservant le
choix de consentement, authentification et sécurisation de
l'authentification, panier/facturation, personnalisation intrinsèque
attendue (par exemple langue), ou équilibrage de charge.

**Attention : l'exemption dépend de la finalité et du fonctionnement
réels du traceur, pas de son nom.**

Pour un SaaS avec authentification, des cookies de
session/authentification peuvent donc relever de cette exemption s'ils
sont effectivement strictement nécessaires au service demandé.

## 3.2 Traceurs soumis au consentement

Tout traceur non couvert par une exemption doit être bloqué jusqu'au
consentement lorsqu'il effectue une opération relevant de l'article 82.
Cela peut notamment concerner, selon leur configuration réelle, certains
outils publicitaires, de suivi inter-sites, de personnalisation non
nécessaire ou de mesure d'audience ne remplissant pas les conditions
d'exemption.

Le consentement doit être :

-   préalable ;
-   libre ;
-   spécifique ;
-   éclairé ;
-   univoque ;
-   démontrable ;
-   retirable aussi facilement qu'il a été donné.

## 3.3 Informations minimales avant le consentement

Les lignes directrices CNIL indiquent qu'il faut au minimum informer
l'utilisateur :

-   de l'identité du ou des responsables du traitement ;
-   des finalités des opérations de lecture ou d'écriture ;
-   de la manière d'accepter ou de refuser les traceurs ;
-   des conséquences liées à l'acceptation ou au refus ;
-   de l'existence du droit de retirer son consentement ;
-   et rendre facilement accessible la liste exhaustive et à jour des
    responsables concernés.

------------------------------------------------------------------------

# 4. Texte proposé --- premier niveau de bannière cookies

> Ce modèle doit être adapté aux traceurs réellement présents. Ne
> conservez pas une finalité qui n'existe pas.

## Version avec traceurs optionnels

**[NOM DU SAAS]** utilise des cookies et autres traceurs strictement
nécessaires au fonctionnement, à la sécurité et à l'authentification du
service. Ces traceurs nécessaires ne requièrent pas votre consentement
lorsqu'ils répondent aux conditions prévues par la réglementation.

Avec votre accord, nous pouvons également utiliser des traceurs pour
**[MESURE D'AUDIENCE NON EXEMPTÉE / PERSONNALISATION / AUTRE FINALITÉ
RÉELLE]**, notamment avec **[NOM(S) DES RESPONSABLES/PARTENAIRES
CONCERNÉS]**.

Vous pouvez **tout accepter**, **tout refuser** pour les traceurs soumis
au consentement ou **personnaliser vos choix**. Votre refus n'empêche
pas l'utilisation des traceurs strictement nécessaires au service.
**[DÉCRIRE ICI TOUTE AUTRE CONSÉQUENCE RÉELLE DU REFUS, S'IL Y EN
A]**.

Vous pouvez modifier ou retirer votre consentement à tout moment depuis
**[EMPLACEMENT DU LIEN « GÉRER MES COOKIES »]**.

Boutons recommandés sur le premier niveau :

**Tout refuser** | **Personnaliser** | **Tout accepter**

### Règle UI importante

Ne pas rendre le refus plus difficile que l'acceptation. La CNIL
considère qu'un bouton « Tout refuser » présenté au même niveau que «
Tout accepter » est un moyen clair de respecter cette exigence. Les
couleurs, tailles ou formes peuvent être adaptées, mais l'interface ne
doit pas tromper ou pousser artificiellement l'utilisateur vers
l'acceptation.

------------------------------------------------------------------------

# 5. Texte proposé --- panneau « Personnaliser mes cookies »

## Cookies strictement nécessaires --- toujours actifs

Ces traceurs sont nécessaires au fonctionnement du service ou à une
fonctionnalité expressément demandée. Lorsqu'ils remplissent les
conditions légales d'exemption, ils ne sont pas soumis au consentement
préalable.

  ---------------------------------------------------------------------------------
  Traceur            Fournisseur           Finalité               Durée
  ------------------ --------------------- ---------------------- -----------------
  **[NOM COOKIE     **[VOTRE SOCIÉTÉ /   **[maintien de        **[session /
  SESSION]**        PRESTATAIRE]**       session /              durée réelle]**
                                           authentification]**   

  **[NOM COOKIE     **[FOURNISSEUR]**   **[sécurisation       **[durée
  SÉCURITÉ]**                             réelle]**             réelle]**

  **[NOM COOKIE     **[FOURNISSEUR]**   Conserver vos choix    **[durée
  CONSENTEMENT]**                         relatifs aux traceurs  choisie]**
  ---------------------------------------------------------------------------------

## Mesure d'audience --- **[activable / non utilisée / exemptée sous conditions]**

**Finalité : [DESCRIPTION CLAIRE DE LA MESURE RÉELLE].**

Prestataire(s) : **[NOM]**\
Traceur(s) : **[NOMS]**\
Durée(s) : **[DURÉES RÉELLES]**\
Transfert hors EEE : **[NON / OUI --- PAYS ET GARANTIE]**

Choix : **Accepter / Refuser**

## **[AUTRE FINALITÉ : ex. personnalisation optionnelle]**

**Finalité : [DESCRIPTION CLAIRE].**

Prestataire(s) : **[NOM]**\
Traceur(s) : **[NOMS]**\
Durée(s) : **[DURÉES RÉELLES]**\
Transfert hors EEE : **[NON / OUI --- PAYS ET GARANTIE]**

Choix : **Accepter / Refuser**

------------------------------------------------------------------------

# 6. Politique de cookies --- texte à intégrer

## 6.1 Objet

La présente politique explique comment **[RAISON SOCIALE]** utilise
des cookies et autres traceurs dans le cadre de **[NOM DU SAAS]**,
accessible à l'adresse **[URL]**.

## 6.2 Qu'est-ce qu'un cookie ou un traceur ?

Un cookie ou traceur est une technologie susceptible de permettre la
lecture ou l'écriture d'informations sur le terminal de l'utilisateur.
La réglementation s'applique plus largement que les seuls cookies HTTP
et peut notamment concerner d'autres identifiants ou techniques de
traçage.

## 6.3 Traceurs utilisés

**[RAISON SOCIALE]** utilise les catégories suivantes :

1.  **Traceurs strictement nécessaires : [DESCRIPTION]**
2.  **[Mesure d'audience : DESCRIPTION OU « non utilisée »]**
3.  **[Personnalisation : DESCRIPTION OU « non utilisée »]**
4.  **[Publicité / suivi : DESCRIPTION OU « non utilisé »]**
5.  **[Autres : DESCRIPTION]**

La liste détaillée des traceurs, de leurs fournisseurs, finalités et
durées est disponible dans **[TABLEAU CI-DESSUS / CENTRE DE
PRÉFÉRENCES]**.

## 6.4 Consentement

Les traceurs qui ne bénéficient pas d'une exemption ne sont déposés ou
lus qu'après votre consentement.

Vous pouvez accepter ou refuser ces traceurs, globalement ou selon les
finalités proposées. L'absence de consentement ne vaut pas consentement.

## 6.5 Retrait et modification des choix

Vous pouvez modifier vos préférences ou retirer votre consentement à
tout moment en utilisant **[LIEN / BOUTON « GÉRER MES COOKIES »]**. Le
retrait doit être aussi simple que l'octroi du consentement.

## 6.6 Conservation du choix

Votre choix est mémorisé pendant **[DURÉE JUSTIFIÉE]**. La CNIL
indique qu'une durée de six mois constitue généralement une bonne
pratique, mais cette durée doit être appréciée au cas par cas.

## 6.7 Contact

Pour toute question relative aux cookies et à la protection des données
: **[EMAIL / DPO / ADRESSE]**.

------------------------------------------------------------------------

# 7. Mentions légales --- modèle à intégrer

> Les champs ci-dessous doivent correspondre à la structure juridique
> réelle de l'éditeur. Certaines mentions commerciales/fiscales
> dépendent du statut et de l'activité. Ce modèle ne doit donc pas être
> publié sans vérification des informations d'immatriculation.

# Mentions légales

## Éditeur du service

Le service **[NOM DU SAAS]** est édité par :

**[RAISON SOCIALE]**\
**[FORME JURIDIQUE]** au capital social de **[CAPITAL SOCIAL] €**\
Siège social : **[ADRESSE COMPLÈTE]**\
Téléphone : **[NUMÉRO DE TÉLÉPHONE]**\
Immatriculation : **[RCS / RNE --- VILLE ET NUMÉRO SELON SITUATION]**\
SIREN : **[SIREN]**\
SIRET : **[SIRET, SI PERTINENT]**\
Numéro de TVA intracommunautaire : **[N° TVA, SI APPLICABLE]**\
Adresse électronique : **[EMAIL DE CONTACT]**

## Directeur de la publication

Directeur de la publication : **[NOM, PRÉNOM ET QUALITÉ DU DIRECTEUR DE
LA PUBLICATION]**.

## Hébergement

Le service est hébergé par :

**[RAISON SOCIALE DE L'HÉBERGEUR]**\
Adresse : **[ADRESSE DE L'HÉBERGEUR]**\
Téléphone : **[TÉLÉPHONE DE L'HÉBERGEUR]**

## Données personnelles

Pour connaître les conditions dans lesquelles **[RAISON SOCIALE]**
traite vos données personnelles et exercer vos droits, consultez notre
**Politique de confidentialité** : **[LIEN]**.

## Cookies

Pour connaître les traceurs utilisés et gérer vos choix, consultez notre
**Politique de cookies** : **[LIEN]** et le centre **[« Gérer mes
cookies »]**.

------------------------------------------------------------------------

# 8. Politique de confidentialité --- modèle complet à adapter

# Politique de confidentialité

Dernière mise à jour : **[DATE]**

## 8.1 Responsable du traitement

Le responsable des traitements décrits dans la présente politique est :

**[RAISON SOCIALE]**\
**[FORME JURIDIQUE]**\
Siège : **[ADRESSE]**\
Email : **[EMAIL]**\
Téléphone : **[TÉLÉPHONE, SI RETENU COMME POINT DE CONTACT]**

Délégué à la protection des données (DPO), si désigné : **[NOM/FONCTION
ET COORDONNÉES DU DPO]**.

## 8.2 Données traitées

Selon votre utilisation de **[NOM DU SAAS]**, nous pouvons traiter les
catégories de données suivantes, **uniquement si elles correspondent
réellement au fonctionnement du service** :

-   données de compte : **[nom, prénom, email, identifiant,
    organisation, etc.]** ;
-   données d'authentification et de sécurité : **[identifiants
    techniques, sessions, journaux de connexion, etc.]** ;
-   données liées aux espaces de travail : **[membres, rôles,
    permissions, invitations, etc.]** ;
-   données de facturation et d'abonnement : **[données réellement
    traitées par votre société ; préciser ce qui est traité directement
    par le prestataire de paiement]** ;
-   fichiers et contenus fournis par les utilisateurs :
    **[DESCRIPTION]** ;
-   journaux techniques et d'audit : **[DESCRIPTION]** ;
-   données de support : **[DESCRIPTION]** ;
-   données relatives aux traceurs : **[DESCRIPTION]**.

Ne pas conserver cette liste telle quelle : supprimer toute catégorie
non traitée et ajouter les catégories réellement utilisées.

## 8.3 Finalités et bases juridiques

  -------------------------------------------------------------------------
  Traitement /       Données           Base juridique     Durée / critère
  finalité           concernées                          
  ------------------ ----------------- ------------------ -----------------
  Création et        **[DONNÉES]**   **[EXÉCUTION DU   **[DURÉE]**
  gestion du compte                    CONTRAT / autre   
                                       base réelle]**   

  Authentification   **[DONNÉES]**   **[EXÉCUTION DU   **[DURÉE]**
  et fourniture du                     CONTRAT / autre   
  SaaS                                 base réelle]**   

  Sécurité,          **[DONNÉES]**   **[INTÉRÊT        **[DURÉE]**
  prévention des                       LÉGITIME /        
  abus et                              OBLIGATION, à     
  journalisation                       qualifier]**     

  Gestion des        **[DONNÉES]**   **[CONTRAT /      **[DURÉE]**
  abonnements et                       OBLIGATION LÉGALE 
  facturation                          selon             
                                       l'opération]**   

  Support            **[DONNÉES]**   **[CONTRAT /      **[DURÉE]**
  utilisateur                          INTÉRÊT LÉGITIME  
                                       selon le cas]**  

  Prospection        **[DONNÉES]**   **[BASE JURIDIQUE **[DURÉE]**
  commerciale                          À DÉTERMINER SELON
                                       LE CAS]**        

  Mesure d'audience  **[DONNÉES]**   **[CONSENTEMENT   **[DURÉE]**
  / traceurs                           OU AUTRE RÉGIME   
                                       APPLICABLE]**    

  **[AUTRE          **[DONNÉES]**   **[BASE]**       **[DURÉE]**
  TRAITEMENT]**                                         
  -------------------------------------------------------------------------

**Ne pas choisir une base juridique par commodité.** Elle doit être
déterminée traitement par traitement avant la collecte.

Lorsque le traitement repose sur l'intérêt légitime, indiquer également
l'intérêt légitime poursuivi : **[INTÉRÊT LÉGITIME PRÉCIS]**.

## 8.4 Données obligatoires et facultatives

Les champs identifiés comme obligatoires dans les formulaires sont
nécessaires à **[FINALITÉ]**. À défaut de fourniture de ces
informations, **[CONSÉQUENCE RÉELLE : impossibilité de créer le compte,
de conclure l'abonnement, etc.]**.

Les autres champs sont facultatifs.

## 8.5 Destinataires

Les données sont accessibles, dans la limite de leurs attributions, à :

-   **[PERSONNELS / SERVICES INTERNES AUTORISÉS]** ;
-   **[HÉBERGEUR]** ;
-   **[FOURNISSEUR EMAIL]** ;
-   **[PRESTATAIRE DE PAIEMENT]** ;
-   **[OUTIL SUPPORT]** ;
-   **[OUTIL ANALYTICS]** ;
-   **[AUTRES SOUS-TRAITANTS OU DESTINATAIRES]** ;
-   aux autorités légalement habilitées lorsque la loi l'exige.

La liste doit refléter les destinataires réels. Les sous-traitants ne
doivent pas être ajoutés de manière hypothétique.

## 8.6 Transferts hors Espace économique européen

**Option A --- aucun transfert :**\
À notre connaissance et au regard de nos prestataires effectivement
utilisés, **[INDIQUER LA SITUATION VÉRIFIÉE]**.

**Option B --- transferts existants :**\
Certaines données peuvent être transférées vers **[PAYS /
ORGANISATION]**. Ces transferts reposent sur **[DÉCISION D'ADÉQUATION
/ CLAUSES CONTRACTUELLES TYPES / AUTRE MÉCANISME APPLICABLE]**. Vous
pouvez obtenir des informations sur les garanties applicables en
contactant **[CONTACT]**.

**Ne pas utiliser l'option A sans audit des sous-traitants et de leurs
propres flux.**

## 8.7 Durées de conservation

Nous conservons les données pendant une durée n'excédant pas celle
nécessaire aux finalités pour lesquelles elles sont traitées, sous
réserve des obligations légales applicables.

  Catégorie                         Durée / critère réel
  --------------------------------- ----------------------------------------------
  Compte utilisateur                **[DURÉE]**
  Données de workspace              **[DURÉE]**
  Fichiers utilisateurs             **[DURÉE + RÈGLE APRÈS SUPPRESSION]**
  Journaux de sécurité              **[DURÉE]**
  Journaux d'audit                  **[DURÉE]**
  Facturation                       **[DURÉE LÉGALE/OPÉRATIONNELLE VÉRIFIÉE]**
  Support                           **[DURÉE]**
  Cookies / choix de consentement   **[DURÉE]**
  **[AUTRE]**                     **[DURÉE]**

Les durées doivent être fixées après analyse juridique et
opérationnelle. Il est déconseillé d'insérer des durées génériques non
vérifiées.

## 8.8 Vos droits

Selon le traitement et sa base juridique, vous pouvez notamment disposer
des droits prévus par le RGPD : accès, rectification, effacement,
limitation, opposition et portabilité. Lorsque le traitement repose sur
votre consentement, vous pouvez retirer ce consentement à tout moment,
sans remettre en cause la licéité du traitement antérieur au retrait.

Pour exercer vos droits ou poser une question sur le traitement de vos
données :

**[EMAIL / FORMULAIRE / ADRESSE POSTALE]**

Une vérification de l'identité peut être demandée lorsqu'elle est
nécessaire et proportionnée pour éviter qu'un tiers n'exerce
frauduleusement vos droits.

Si, après nous avoir contactés, vous estimez que vos droits ne sont pas
respectés, vous pouvez introduire une réclamation auprès de la
Commission nationale de l'informatique et des libertés (CNIL).

## 8.9 Sécurité

**[RAISON SOCIALE]** met en œuvre des mesures techniques et
organisationnelles appropriées au regard des risques afin de protéger
les données personnelles.

**[NE DÉCRIRE ICI QUE DES MESURES RÉELLEMENT EN PLACE ET QU'IL EST
OPPORTUN DE RENDRE PUBLIQUES : contrôle d'accès, chiffrement,
journalisation, sauvegardes, etc.]**

## 8.10 Sous-traitants

Lorsque **[RAISON SOCIALE]** fait appel à des prestataires traitant
des données personnelles pour son compte, ces relations doivent être
encadrées conformément aux exigences applicables du RGPD.

Principaux prestataires : **[LISTE RÉELLE OU LIEN VERS UNE LISTE
MAINTENUE À JOUR]**.

## 8.11 Modification de la politique

La présente politique peut être mise à jour pour refléter une évolution
du service, des traitements ou du cadre juridique. La version en vigueur
est celle publiée sur **[URL]** avec sa date de mise à jour.

En cas de modification substantielle affectant les traitements ou les
droits des utilisateurs, **[DÉCRIRE LE MODE D'INFORMATION RETENU :
notification dans l'application, email, etc.]**.

------------------------------------------------------------------------

# 9. Mention courte à placer sous les formulaires

Les données renseignées dans ce formulaire sont traitées par **[RAISON
SOCIALE]** afin de **[FINALITÉ]**, sur la base de **[BASE
JURIDIQUE]**. Les champs marqués d'un astérisque sont obligatoires ; à
défaut, **[CONSÉQUENCE]**.

Pour en savoir plus sur les destinataires, les durées de conservation et
l'exercice de vos droits, consultez notre **Politique de confidentialité
: [LIEN]**.

------------------------------------------------------------------------

# 10. Cas particulier d'un SaaS multi-utilisateur / multi-tenant

Avant publication, il faut qualifier juridiquement le rôle du SaaS pour
chaque traitement.

Dans un SaaS B2B multi-tenant, l'éditeur peut être :

-   **responsable du traitement** pour ses propres traitements (création
    de comptes, abonnement, sécurité de sa plateforme, facturation,
    prospection, etc., selon la réalité) ;
-   **sous-traitant** pour certaines données que les clients
    professionnels introduisent dans leurs workspaces et traitent pour
    leurs propres finalités ;
-   éventuellement dans une autre qualification pour certains
    traitements spécifiques.

Cette qualification **ne peut pas être déterminée abstraitement**. Elle
dépend de qui détermine les finalités et les moyens du traitement. Les
contrats avec les clients doivent être cohérents avec cette
qualification, notamment lorsqu'un accord de sous-traitance au titre de
l'article 28 du RGPD est requis.

------------------------------------------------------------------------

# 11. Ce qui doit être paramétrable dans l'application

Pour une architecture professionnelle, le centre de préférences devrait
permettre de gérer au minimum :

1.  **Traceurs nécessaires** : visibles mais non désactivables
    lorsqu'ils sont réellement exemptés.
2.  **Chaque finalité soumise au consentement** : activation/refus
    séparé lorsque nécessaire pour obtenir un consentement spécifique.
3.  **Tout accepter**.
4.  **Tout refuser**.
5.  **Enregistrer mes choix**.
6.  Un accès permanent à **« Gérer mes cookies »** pour modifier ou
    retirer le consentement.
7.  Une preuve du consentement permettant de démontrer le choix exprimé
    et la version de l'information présentée.
8.  La mise à jour de la liste des responsables/partenaires et des
    finalités.
9.  Le blocage effectif des traceurs soumis au consentement tant que
    l'accord n'a pas été obtenu.
10. La mémorisation du refus comme de l'acceptation afin de ne pas
    solliciter inutilement l'utilisateur.

Pour un SaaS authentifié utilisé sur plusieurs terminaux, la CNIL a
publié en 2026 des recommandations spécifiques au consentement
multi-terminaux. Si vous synchronisez les préférences cookies au niveau
du compte, ce mécanisme doit faire l'objet d'une analyse dédiée.

------------------------------------------------------------------------

# 12. Checklist avant mise en production

-   [ ] Identifier l'entité juridique éditrice.
-   [ ] Compléter les mentions légales avec les données réelles.
-   [ ] Cartographier tous les traitements de données personnelles.
-   [ ] Déterminer la base juridique de chaque traitement.
-   [ ] Identifier les données obligatoires/facultatives dans chaque
    formulaire.
-   [ ] Fixer et documenter les durées de conservation.
-   [ ] Lister tous les destinataires et sous-traitants.
-   [ ] Auditer les transferts hors EEE.
-   [ ] Qualifier le rôle responsable de traitement / sous-traitant pour
    chaque traitement.
-   [ ] Inventorier tous les cookies, local storage, pixels, SDK et
    autres traceurs.
-   [ ] Classer chaque traceur : exempté ou soumis au consentement.
-   [ ] Bloquer techniquement les traceurs soumis au consentement avant
    accord.
-   [ ] Prévoir « Tout accepter » et un refus aussi simple.
-   [ ] Prévoir un paramétrage par finalité lorsque nécessaire.
-   [ ] Prévoir un retrait permanent et simple.
-   [ ] Conserver une preuve du consentement.
-   [ ] Tester que « Tout refuser » n'empêche pas les fonctions reposant
    uniquement sur des traceurs strictement nécessaires.
-   [ ] Publier la politique de confidentialité.
-   [ ] Publier la politique de cookies.
-   [ ] Ajouter les mentions courtes d'information aux formulaires.
-   [ ] Mettre en place un canal d'exercice des droits.
-   [ ] Vérifier les contrats de sous-traitance RGPD avec les
    prestataires.
-   [ ] Vérifier les contrats B2B / DPA avec les clients lorsque le SaaS
    agit comme sous-traitant.
-   [ ] Organiser la mise à jour des politiques lors d'un changement de
    prestataire, finalité ou traceur.

------------------------------------------------------------------------

# 13. Limites et points non déterminables sans audit du SaaS

Je ne sais pas, à partir des seules informations disponibles :

-   quelle sera exactement **l'entité juridique éditrice** ;
-   quel sera **l'hébergeur de production** ;
-   quels seront tous les **sous-traitants** ;
-   si des **transferts hors EEE** auront lieu ;
-   quels outils d'analytics, support, paiement, email ou IA seront
    utilisés en production ;
-   quelles **durées de conservation** seront juridiquement et
    opérationnellement retenues ;
-   quels traceurs seront effectivement déposés dans le navigateur ;
-   si un **DPO** devra être désigné ou le sera volontairement ;
-   la qualification exacte responsable/sous-traitant pour chaque futur
    module métier.

Ces éléments doivent être déterminés avant de remplacer les champs en
gras et avant publication.

------------------------------------------------------------------------

# 14. Sources institutionnelles vérifiées

1.  **Union européenne --- EUR-Lex.** Règlement (UE) 2016/679, notamment
    articles 12, 13, 15 à 22 et 28. 2016-04-27.\
    https://eur-lex.europa.eu/eli/reg/2016/679/oj?locale=fr

2.  **CNIL.** Conformité RGPD : comment informer les personnes et
    assurer la transparence ? Page institutionnelle consultée le
    2026-09-03.\
    https://www.cnil.fr/fr/conformite-rgpd-information-des-personnes-et-transparence

3.  **CNIL.** Informer les personnes. Page institutionnelle consultée le
    2026-09-03.\
    https://www.cnil.fr/fr/informer-les-personnes

4.  **CNIL.** Exemples de formulaire de collecte de données à caractère
    personnel. Page institutionnelle consultée le 2026-09-03.\
    https://www.cnil.fr/fr/exemples-de-formulaire-de-collecte-de-donnees-caractere-personnel

5.  **CNIL.** Cookies et traceurs : que dit la loi ? Page
    institutionnelle consultée le 2026-09-03.\
    https://www.cnil.fr/fr/cookies-et-autres-traceurs/que-dit-la-loi

6.  **CNIL.** Questions-réponses sur les lignes directrices
    modificatives et la recommandation « cookies et autres traceurs ».
    Version institutionnelle consultée le 2026-09-03.\
    https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/FAQ

7.  **CNIL.** Recommandation proposant des modalités pratiques de mise
    en conformité en cas de recours aux « cookies et autres traceurs »
    --- version consolidée publiée en 2026. Consultée le 2026-09-03.\
    https://www.cnil.fr/sites/default/files/2026-01/recommandation_cookies_consolidee.pdf

8.  **CNIL.** Cookies et autres traceurs : recommandations finales sur
    le consentement multi-terminaux. 2026. Consultée le 2026-09-03.\
    https://www.cnil.fr/fr/cookies-et-autres-traceurs-recommandations-finales-sur-le-consentement-multi-terminaux

9.  **Légifrance.** Loi n° 78-17 du 6 janvier 1978, article 82 ---
    traceurs et accès au terminal. Version en vigueur depuis le
    2019-06-01, consultée le 2026-09-03.\
    https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000037813978

10. **Légifrance.** Délibération CNIL n° 2020-091 du 17 septembre 2020,
    lignes directrices cookies et autres traceurs. 2020-09-17.\
    https://www.legifrance.gouv.fr/jorf/texte_jo/JORFTEXT000042388179

11. **Légifrance.** Loi n° 2004-575 du 21 juin 2004 pour la confiance
    dans l'économie numérique, article 6 III --- identification de
    l'éditeur et de l'hébergeur. 2004-06-21, version consultée le
    2026-09-03.\
    https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044067469/

12. **Direction de l'information légale et administrative ---
    Entreprendre.Service-Public.fr.** Obligations en matière de
    protection des données personnelles (RGPD). Page institutionnelle
    consultée le 2026-09-03.\
    https://entreprendre.service-public.fr/vosdroits/F24270

13. **Direction de l'information légale et administrative ---
    Entreprendre.Service-Public.fr.** Mentions légales. Vérifié le
    2025-05-26, consulté le 2026-09-03.\
    https://entreprendre.service-public.fr/P10025

------------------------------------------------------------------------

## Conclusion opérationnelle

Le développement ne doit pas commencer par une bannière générique copiée
d'un autre site. La bonne séquence est :

**inventaire des traitements et traceurs → qualification juridique →
choix des bases légales et durées → paramétrage du gestionnaire de
consentement → rédaction finale des textes → tests techniques de
blocage/refus/retrait → validation avant production.**

Les champs **en gras** de ce document constituent les principales
données variables à renseigner après cet audit.
