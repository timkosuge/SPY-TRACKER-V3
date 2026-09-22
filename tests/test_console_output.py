import ast
import glob
import unittest


class ConsoleOutput(unittest.TestCase):
    def test_every_print_can_be_written_to_a_windows_pipe(self):
        found = []
        for p in sorted(glob.glob("**/*.py", recursive=True)):
            if p.startswith(("tests", "scripts")):
                continue
            with open(p, encoding="utf-8") as f:
                src = f.read()
            for node in ast.walk(ast.parse(src)):
                if isinstance(node, ast.Call) and getattr(node.func, "id", None) == "print":
                    seg = ast.get_source_segment(src, node) or ""
                    try:
                        seg.encode("cp1252")
                    except UnicodeEncodeError:
                        found.append(f"{p}:{node.lineno}")
        self.assertEqual(found, [])


if __name__ == "__main__":
    unittest.main()
