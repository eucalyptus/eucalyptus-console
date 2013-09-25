# Copyright 2012 Eucalyptus Systems, Inc.
#
# Redistribution and use of this software in source and binary forms,
# with or without modification, are permitted provided that the following
# conditions are met:
#
#   Redistributions of source code must retain the above copyright notice,
#   this list of conditions and the following disclaimer.
#
#   Redistributions in binary form must reproduce the above copyright
#   notice, this list of conditions and the following disclaimer in the
#   documentation and/or other materials provided with the distribution.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
# "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
# LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
# A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
# OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
# SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
# LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
# DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
# THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
# (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
# OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

from distutils.command.build_py import build_py
from distutils.command.sdist import sdist
from distutils.core import setup
import filecmp
import os.path
import shutil

from eucaconsole import __version__


DATA_DIR='/usr/share/eucalyptus-console'


def get_data_files(path):
    data_files = {}
    for root, _, filenames in os.walk(path, followlinks=True):
        data_file_dir = os.path.join(DATA_DIR, root)
        for filename in filenames:
            data_files.setdefault(data_file_dir, [])
            data_files[data_file_dir].append(os.path.join(root, filename))
    return list(data_files.items())


DATA_FILES = get_data_files("static")
DATA_FILES.append(('/etc/eucalyptus-console', ['conf/console.ini']))


if (os.path.isfile('conf/console.ini') and
        os.path.isfile('conf/console.ini.default') and
        filecmp.cmp('conf/console.ini', 'conf/console.ini.default')):
    # Overwrite console.ini with the default version
    # We want to make sure we don't include the developer config
    shutil.move('conf/console.ini', 'conf/console.ini.bak')
    shutil.copyfile('conf/console.ini.default', 'conf/console.ini')
elif (os.path.isfile('conf/console.ini.default') and
        not os.path.isfile('conf/console.ini')):
    shutil.copyfile('conf/console.ini.default', 'conf/console.ini')


class build_py_with_git_version(build_py):
    '''Like build_py, but also hardcoding the version in version.__version__
       so it's consistent even outside of the source tree'''

    def build_module(self, module, module_file, package):
        build_py.build_module(self, module, module_file, package)
        print module, module_file, package
        if module == 'version' and '.' not in package:
            version_line = "__version__ = '{0}'\n".format(__version__)
            old_ver_name = self.get_module_outfile(self.build_lib, (package,),
                                                    module)
            new_ver_name = old_ver_name + '.new'
            with open(new_ver_name, 'w') as new_ver:
                with open(old_ver_name) as old_ver:
                    for line in old_ver:
                        if line.startswith('__version__ ='):
                            new_ver.write(version_line)
                        else:
                            new_ver.write(line)
                new_ver.flush()
            os.rename(new_ver_name, old_ver_name)


class sdist_with_git_version(sdist):
    '''Like sdist, but also hardcoding the version in version.__version__ so
       it's consistent even outside of the source tree'''

    def make_release_tree(self, base_dir, files):
        sdist.make_release_tree(self, base_dir, files)
        version_line = "__version__ = '{0}'\n".format(__version__)
        old_ver_name = os.path.join(base_dir, 'eucaconsole/version.py')
        new_ver_name = old_ver_name + '.new'
        with open(new_ver_name, 'w') as new_ver:
            with open(old_ver_name) as old_ver:
                for line in old_ver:
                    if line.startswith('__version__ ='):
                        new_ver.write(version_line)
                    else:
                        new_ver.write(line)
            new_ver.flush()
        os.rename(new_ver_name, old_ver_name)


install_requires = [
    'tornado',
    'sockjs-tornado'
]


setup(name="eucaconsole",
      version=__version__,
      description="Eucalyptus User Interface Console",
      long_description="Eucalyptus User Interface Console",
      author="Eucalyptus Systems, Inc.",
      author_email="develop@eucalyptus.com",
      license="GPL v3",
      url="http://www.eucalyptus.com",
      packages=['eucaconsole'],
      package_data={'eucaconsole': ['eucaconsole/console.ini']},
      scripts=['euca-console-server'],
      install_requires=install_requires,
      data_files=DATA_FILES,
      cmdclass={'build_py': build_py_with_git_version,
                'sdist': sdist_with_git_version})
