import os
import subprocess
import tempfile
import unittest

import yaml

WORKFLOWS = (".github/workflows/spy_tracker.yml", ".github/workflows/sentiment_update.yml")


def git(cwd, *args):
    return subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True, check=True).stdout


class Workflow(unittest.TestCase):
    def test_runs_of_the_same_workflow_queue_instead_of_overlapping(self):
        for path in WORKFLOWS:
            with open(path, encoding="utf-8") as f:
                d = yaml.safe_load(f)
            self.assertIn("concurrency", d, path)
            self.assertIs(d["concurrency"]["cancel-in-progress"], False, path)

    def test_the_commit_step_keeps_its_own_payloads_and_retries(self):
        for path in WORKFLOWS:
            with open(path, encoding="utf-8") as f:
                s = f.read()
            self.assertIn("git rebase -X theirs --autostash origin/main", s, path)
            self.assertIn("for attempt in 1 2 3", s, path)
            self.assertNotIn("git pull --rebase --autostash origin main", s, path)


class RebaseBehaviour(unittest.TestCase):
    def test_a_racing_run_keeps_its_payloads_without_reverting_anyone_elses_code(self):
        root = tempfile.mkdtemp()
        origin, runner = os.path.join(root, "origin"), os.path.join(root, "runner")
        os.makedirs(origin)
        git(origin, "init", "-q", "-b", "main")
        for repo in (origin,):
            git(repo, "config", "user.email", "a@a"); git(repo, "config", "user.name", "a")
        open(os.path.join(origin, "code.js"), "w").write("base\n")
        open(os.path.join(origin, "payload.js"), "w").write("old\n")
        git(origin, "add", "-A"); git(origin, "commit", "-qm", "base")
        git(root, "clone", "-q", origin, runner)
        git(runner, "config", "user.email", "b@b"); git(runner, "config", "user.name", "b")
        open(os.path.join(origin, "code.js"), "a").write("tim edit\n")
        open(os.path.join(origin, "payload.js"), "w").write("other run\n")
        open(os.path.join(origin, "new.js"), "w").write("other run\n")
        git(origin, "add", "-A"); git(origin, "commit", "-qm", "tim and another run")
        open(os.path.join(runner, "payload.js"), "w").write("this run\n")
        open(os.path.join(runner, "new.js"), "w").write("this run\n")
        git(runner, "add", "-A"); git(runner, "commit", "-qm", "this run")
        git(runner, "fetch", "-q", "origin", "main")
        git(runner, "rebase", "-X", "theirs", "--autostash", "origin/main")
        read = lambda f: open(os.path.join(runner, f)).read()
        self.assertEqual(read("payload.js"), "this run\n")
        self.assertEqual(read("new.js"), "this run\n")
        self.assertEqual(read("code.js"), "base\ntim edit\n")


if __name__ == "__main__":
    unittest.main()
