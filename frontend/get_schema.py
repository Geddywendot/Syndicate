import requests
url = "https://opsmsvjekeaizzluwywi.supabase.co/rest/v1/?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wc21zdmpla2VhaXp6bHV3eXdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNzc4MDEsImV4cCI6MjA5Mzc1MzgwMX0.PjpXmK512qemlmcwZv6vBNh-mL1DxV9PGII3Fyflngs"
r = requests.get(url)
schema = r.json()
print([k for k in schema.get('definitions', {}).keys()])
if 'notifications' in schema.get('definitions', {}):
    print(schema['definitions']['notifications'])
