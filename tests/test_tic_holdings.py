import sys
import unittest

sys.path.insert(0, ".")
import generate_tic_holdings as tic

SAMPLE = """\t\t\tMAJOR FOREIGN HOLDERS OF TREASURY SECURITIES\t\t\r
\t\t\t\t    (in billions of dollars)\t\t\r
\r
\tDec\tNov\tOct\t\t\r
Country\t2025\t2025\t2025\t\t\r
\t------\t------\t------\t\t\r
\r
Japan\t1185.5\t1202.7\t1200\t\t\r
United Kingdom\t863.1\t879.8\t875.4\t\t\r
"China, Mainland"\t684.4\t683.9\t687.7\t\t\r
Grand Total\t9269.5\t9349.6\t9230.5\t\t\r
\r
\tDec\tNov\tOct\t\t\r
Country\t2024\t2024\t2024\t\t\r
\t------\t------\t------\t\t\r
Japan\t1061.5\t1087.1\t1101.5\t\t\r
"China, Mainland"\t759.0\t768.6\t760.1\t\t\r
Grand Total\t8620.8\t8723.3\t8693.5\t\t\r
"""


class TicParse(unittest.TestCase):
    def test_every_block_is_read_and_periods_are_dated(self):
        out = tic.parse(SAMPLE)
        self.assertEqual(out["japan"]["2025-12"], 1185.5)
        self.assertEqual(out["china"]["2025-10"], 687.7)
        self.assertEqual(out["china"]["2024-12"], 759.0)
        self.assertEqual(out["total"]["2024-10"], 8693.5)
        self.assertEqual(len(out["japan"]), 6)


if __name__ == "__main__":
    unittest.main()
