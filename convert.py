import pandas as pd

# Load Excel
df = pd.read_excel('data/dataset.xlsx')

# Save as CSV
df.to_csv('data/dataset.csv', index=False)

print(f"Converted! {len(df)} rows saved to data/gtd_sample.csv")