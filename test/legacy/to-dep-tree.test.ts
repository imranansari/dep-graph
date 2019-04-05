import * as _ from 'lodash';
import * as depGraphLib from '../../src';
import * as helpers from '../helpers';

describe('dep-trees survive serialisation through dep-graphs', () => {
  const depTreeFixtures: Array<{
    description: string,
    path: string,
    pkgManagerName: string,  // the caller will provide for tree -> graph
    pkgType: string, // the caller will provide for graph -> tree
  }> = [
    {
      description: 'goof',
      path: 'goof-dep-tree.json',
      pkgManagerName: 'npm',
      pkgType: 'npm',
    },
    {
      description: 'simple dep-tree',
      path: 'simple-dep-tree.json',
      pkgManagerName: 'maven',
      pkgType: 'maven',
    },
    {
      description: 'os dep-tree (apk)',
      path: 'os-apk-dep-tree.json',
      pkgManagerName: 'apk',
      pkgType: 'apk',
    },
    {
      description: 'os dep-tree (apt)',
      path: 'os-apt-dep-tree.json',
      pkgManagerName: 'apt',
      pkgType: 'apt',
    },
    {
      description: 'os dep-tree (deb)',
      path: 'os-deb-dep-tree.json',
      pkgManagerName: 'deb',
      pkgType: 'deb',
    },
    {
      description: 'os dep-tree (rpm)',
      path: 'os-rpm-dep-tree.json',
      pkgManagerName: 'rpm',
      pkgType: 'rpm',
    },
    {
      description: 'maven dep-tree',
      path: 'maven-dep-tree.json',
      pkgManagerName: 'maven',
      pkgType: 'maven',
    },
    {
      description: 'sbt dep-tree',
      path: 'sbt-dep-tree.json',
      pkgManagerName: 'sbt',
      pkgType: 'maven',
    },
    {
      description: 'gradle dep-tree',
      path: 'gradle-dep-tree.json',
      pkgManagerName: 'gradle',
      pkgType: 'maven',
    },
    {
      description: 'pip dep-tree',
      path: 'pip-dep-tree.json',
      pkgManagerName: 'pip',
      pkgType: 'pip',
    },
  ];

  for (const fixture of depTreeFixtures) {
    test(fixture.description, async () => {
      const inputTree = helpers.loadFixture(fixture.path);
      const inputGraph = await depGraphLib.legacy.depTreeToGraph(inputTree, fixture.pkgManagerName);
      const inputJSON = JSON.stringify(inputGraph);
      const outputJSON = JSON.parse(inputJSON);
      const outputGraph = depGraphLib.createFromJSON(outputJSON);
      const outputTree = await depGraphLib.legacy.graphToDepTree(outputGraph, fixture.pkgType);

      expect(outputTree.type).toEqual(fixture.pkgManagerName);
      delete outputTree.type;

      expect(outputTree).toEqual(inputTree);
    });
  }
});

test('graphToDepTree simple dysmorphic', async () => {
  // NOTE: this package tree is "dysmorphic"
  // i.e. it has a package that appears twice in the tree
  // at the exact same version, but with slightly differently resolved
  // dependencies
  const depGraphData = helpers.loadFixture('simple-graph.json');
  const depGraph = depGraphLib.createFromJSON(depGraphData);
  const expectedDepTree = helpers.loadFixture('simple-dep-tree.json');

  const depTree = await depGraphLib.legacy.graphToDepTree(depGraph, 'maven');
  expect(depTree.type).toEqual('maven');
  delete depTree.type;
  expect(depTree).toEqual(expectedDepTree);
});

describe('graphToDepTree with a linux pkgManager', () => {
  test('creates the correct .targetOS', async () => {
    const depGraphData = helpers.loadFixture('os-deb-graph.json');
    const depGraph = depGraphLib.createFromJSON(depGraphData);
    const expectedDepTree = helpers.loadFixture('os-deb-dep-tree.json');

    const depTree = await depGraphLib.legacy.graphToDepTree(depGraph, 'deb');

    expect(depTree.type).toEqual('deb');
    delete depTree.type;
    expect(depTree).toEqual(expectedDepTree);
  });

  describe('errors with an incomplete pkgManager', () => {
    test('missing repositories', async () => {
      const depGraphData = helpers.loadFixture('os-deb-graph.json');
      const depGraph = depGraphLib.createFromJSON(depGraphData);
      delete depGraph.pkgManager.repositories;

      await expect(depGraphLib.legacy.graphToDepTree(depGraph, 'deb'))
        .rejects
        .toThrow('Incomplete .pkgManager, could not create .targetOS');
    });

    test('missing repository alias', async () => {
      const depGraphData = helpers.loadFixture('os-deb-graph.json');
      const depGraph = depGraphLib.createFromJSON(depGraphData);
      delete depGraph.pkgManager.repositories[0].alias;

      await expect(depGraphLib.legacy.graphToDepTree(depGraph, 'deb'))
        .rejects
        .toThrow('Incomplete .pkgManager, could not create .targetOS');
    });
  });
});

test('graphs with cycles are not supported', async () => {
  const cyclicDepGraphData = helpers.loadFixture('cyclic-dep-graph.json');
  const cyclicDepGraph = depGraphLib.createFromJSON(cyclicDepGraphData);

  await expect(depGraphLib.legacy.graphToDepTree(cyclicDepGraph, 'pip'))
    .rejects
    .toThrow('Conversion to DepTree does not support cyclic graphs yet');
});
